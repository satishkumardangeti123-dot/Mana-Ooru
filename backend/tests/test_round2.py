"""Backend tests for Mana Ooru round-2 features.

Covers: Google Auth session, Push registration, Voice transcribe route existence,
Bus timings, Community Feed (posts), Business Editor (edit-login/me/PUT),
Uploads auth guard, and MongoDB _id leak checks.
"""
import os
import hashlib
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://local-connect-677.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _no_underscore_id(obj):
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked: {obj}"
        for v in obj.values():
            _no_underscore_id(v)
    elif isinstance(obj, list):
        for x in obj:
            _no_underscore_id(x)


# -------- Bus timings --------
class TestBuses:
    def test_buses_patavala(self, s):
        r = s.get(f"{API}/buses", params={"location_id": "patavala", "limit": 25})
        assert r.status_code == 200
        d = r.json()
        assert d["location_id"] == "patavala"
        assert "now_ist" in d
        assert isinstance(d["buses"], list)
        assert 6 <= len(d["buses"]) <= 25 or len(d["buses"]) >= 6
        for b in d["buses"]:
            assert b["eta_min"] >= 0, f"negative ETA: {b}"
            assert b.get("time") and b.get("to_en") and b.get("to_te") and b.get("route")
        _no_underscore_id(d)

    def test_buses_other_location_empty(self, s):
        r = s.get(f"{API}/buses", params={"location_id": "kakinada"})
        assert r.status_code == 200
        d = r.json()
        assert d["buses"] == []


# -------- Community Feed --------
class TestPosts:
    def test_list_posts(self, s):
        r = s.get(f"{API}/posts", params={"location_id": "patavala"})
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        _no_underscore_id(d)

    def test_create_post_requires_auth(self, s):
        r = s.post(f"{API}/posts", json={
            "title": "T", "body": "b", "location_id": "patavala",
        })
        assert r.status_code == 401


# -------- Announcements broadcast --------
class TestBroadcast:
    def test_broadcast_creates_update(self, s):
        r = s.post(f"{API}/announcements/broadcast", json={
            "location_id": "patavala",
            "title": "TEST_Broadcast",
            "message": "TEST_Hello",
            "tag_en": "TEST_Tag",
            "tag_te": "TEST_Tag",
        })
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["status"] == "ok"
        # Verify persisted in /api/updates
        r2 = s.get(f"{API}/updates", params={"location_id": "patavala"})
        assert r2.status_code == 200
        titles = [u["title_en"] for u in r2.json()]
        assert "TEST_Broadcast" in titles


# -------- Business editor --------
class TestBusinessEditor:
    @pytest.fixture(scope="class")
    def first_biz(self, s):
        r = s.get(f"{API}/businesses", params={"location_id": "patavala"})
        assert r.status_code == 200
        rows = r.json()
        assert rows, "no businesses seeded"
        return rows[0]

    @staticmethod
    def _code(bid: str) -> str:
        return f"{int(hashlib.sha1(bid.encode()).hexdigest(), 16) % 1000000:06d}"

    def test_login_wrong_code(self, s, first_biz):
        bid = first_biz["id"]
        r = s.post(f"{API}/business/{bid}/edit-login", json={"code": "000000"})
        # It might be the correct code (rare); if so, skip
        if r.status_code == 200:
            pytest.skip("000000 happened to be the correct code for this biz")
        assert r.status_code == 401

    def test_login_correct_code_then_me_and_update(self, s, first_biz):
        bid = first_biz["id"]
        code = self._code(bid)
        r = s.post(f"{API}/business/{bid}/edit-login", json={"code": code})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["business_id"] == bid
        assert data.get("business_name")
        token = data["token"]

        # /me without token -> 401
        r = s.get(f"{API}/business/{bid}/me")
        assert r.status_code == 401

        # /me with token -> 200 full business
        r = s.get(f"{API}/business/{bid}/me", headers={"X-Edit-Token": token})
        assert r.status_code == 200
        biz = r.json()
        assert biz["id"] == bid
        _no_underscore_id(biz)

        # Save original values to restore
        orig_open = biz.get("open_now", True)
        orig_hours_en = biz.get("hours_en")

        # PUT update
        r = s.put(
            f"{API}/business/{bid}",
            headers={"X-Edit-Token": token},
            json={"open_now": False, "hours_en": "7 AM - 9 PM"},
        )
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["open_now"] is False
        assert updated["hours_en"] == "7 AM - 9 PM"
        _no_underscore_id(updated)

        # Re-fetch confirms persistence
        r = s.get(f"{API}/businesses/{bid}")
        assert r.status_code == 200
        assert r.json()["hours_en"] == "7 AM - 9 PM"

        # Restore
        s.put(
            f"{API}/business/{bid}",
            headers={"X-Edit-Token": token},
            json={"open_now": orig_open, "hours_en": orig_hours_en},
        )

    def test_put_without_token(self, s, first_biz):
        bid = first_biz["id"]
        r = s.put(f"{API}/business/{bid}", json={"open_now": True})
        assert r.status_code == 401


# -------- Uploads auth --------
class TestUploads:
    def test_upload_requires_auth(self, s):
        # Multipart without auth
        r = requests.post(f"{API}/uploads", files={"file": ("a.jpg", b"x", "image/jpeg")})
        assert r.status_code == 401


# -------- Voice transcribe --------
class TestVoice:
    def test_transcribe_empty(self, s):
        # Empty file body -> should be 400 (empty audio)
        r = requests.post(f"{API}/voice/transcribe", files={"file": ("x.m4a", b"", "audio/m4a")})
        assert r.status_code in (400, 413, 500, 502), r.text

    def test_transcribe_random_bytes(self, s):
        r = requests.post(
            f"{API}/voice/transcribe",
            files={"file": ("x.m4a", os.urandom(1024), "audio/m4a")},
        )
        # Not real audio -> whisper likely fails -> 502; anything not 404/200 is acceptable
        assert r.status_code != 404
        assert r.status_code in (400, 413, 500, 502), r.text


# -------- Auth --------
class TestAuth:
    def test_session_garbage(self, s):
        r = s.post(f"{API}/auth/session", json={"session_id": "nope-nope"})
        assert r.status_code == 401

    def test_me_without_auth(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_bogus_bearer(self, s):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer notatoken"})
        assert r.status_code == 401


# -------- Push --------
class TestPush:
    def test_register_push(self, s):
        r = s.post(f"{API}/register-push", json={
            "user_id": "TEST_anon_user",
            "platform": "ios",
            "device_token": "TEST_device_token_abc123",
        })
        assert r.status_code in (200, 201), r.text
        assert r.json().get("status") == "registered"
