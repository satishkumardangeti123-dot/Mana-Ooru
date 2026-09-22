"""Security-audit verification tests for Mana Ooru backend.

Covers SEC-001..SEC-005 fixes + non-regression sanity.
Hits the live public URL (Kubernetes ingress) so it exercises the same route
map that mobile clients see.
"""
import os
import hashlib
import uuid
from datetime import datetime, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://local-connect-677.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def mdb():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


def _no_underscore_id(obj):
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked: keys={list(obj)[:5]}"
        for v in obj.values():
            _no_underscore_id(v)
    elif isinstance(obj, list):
        for x in obj:
            _no_underscore_id(x)


# =====================================================================
# SEC-001 — public /announcements/broadcast removed, admin route exists
# =====================================================================
class TestSEC001Broadcast:
    def test_public_broadcast_removed(self, s):
        r = s.post(f"{API}/announcements/broadcast", json={
            "location_id": "patavala",
            "title": "SEC_should_not_appear",
            "message": "nope",
        })
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text}"

    def test_admin_broadcast_requires_auth(self, s):
        r = s.post(f"{API}/admin/announcements/broadcast", json={
            "location_id": "patavala",
            "title": "SEC_admin_test",
            "message": "nope",
        })
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"


# =====================================================================
# SEC-002 — legacy 6-digit codes rejected + rate limit 429 after 5 fails
# =====================================================================
class TestSEC002EditCodes:
    @pytest.fixture(scope="class")
    def first_biz(self, s):
        r = s.get(f"{API}/businesses", params={"location_id": "patavala"})
        assert r.status_code == 200
        rows = r.json()
        assert rows, "no businesses seeded"
        return rows[0]

    @staticmethod
    def _legacy_code(bid: str) -> str:
        return f"{int(hashlib.sha1(bid.encode()).hexdigest(), 16) % 1000000:06d}"

    def test_legacy_code_rejected(self, s, first_biz, mdb):
        bid = first_biz["id"]
        # Reset the failed-attempts window so previous test noise doesn't
        # rate-limit us on the very first request. Same-hour records for this
        # business_id get scrubbed before we probe.
        mdb.edit_login_attempts.delete_many({"business_id": bid})

        legacy = self._legacy_code(bid)
        r = s.post(f"{API}/business/{bid}/edit-login", json={"code": legacy})
        assert r.status_code == 401, (
            f"legacy code {legacy} should be rejected; got {r.status_code} {r.text}"
        )

    def test_rate_limit_429_after_five_fails(self, s, mdb):
        # Use the *second* business to avoid poisoning the shared first_biz row.
        r = s.get(f"{API}/businesses", params={"location_id": "patavala"})
        rows = r.json()
        assert len(rows) >= 2
        bid = rows[1]["id"]
        mdb.edit_login_attempts.delete_many({"business_id": bid})

        # 5 wrong attempts → 401 each
        for i in range(5):
            r = s.post(f"{API}/business/{bid}/edit-login", json={"code": "00000000"})
            assert r.status_code == 401, f"attempt {i+1}: expected 401, got {r.status_code}"
        # 6th → 429
        r = s.post(f"{API}/business/{bid}/edit-login", json={"code": "00000000"})
        assert r.status_code == 429, f"6th attempt: expected 429, got {r.status_code}"

        # Clean up so we don't leak rate-limit state to other tests
        mdb.edit_login_attempts.delete_many({"business_id": bid})


# =====================================================================
# SEC-003 — /files path traversal & namespace enforcement
# =====================================================================
class TestSEC003PathTraversal:
    def test_dotdot_rejected(self, s):
        # NOTE: The literal path `/api/files/../../etc/passwd` is normalised to
        # `/etc/passwd` by RFC-compliant HTTP clients and by the Kubernetes
        # ingress before it reaches FastAPI (so it never hits the /files
        # handler, and there is no traversal risk to defend against there).
        # To actually exercise the backend's traversal defence we send the
        # dots URL-encoded so the ingress passes them through verbatim and
        # the /files/{path:path} handler is invoked with `..` in the path.
        r = requests.get(
            f"{API}/files/..%2F..%2Fetc%2Fpasswd",
            allow_redirects=False,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code}"

    def test_other_namespace_rejected(self, s):
        r = s.get(f"{API}/files/other-app/anything")
        assert r.status_code == 404, f"expected 404, got {r.status_code}"

    def test_valid_prefix_missing_key(self, s):
        r = s.get(f"{API}/files/mana-ooru/nonexistent-key-xyz")
        assert r.status_code == 404, f"expected 404, got {r.status_code}"


# =====================================================================
# SEC-004 — report spam dedup, auto-hide on 5th unique, no hidden_if
# =====================================================================
class TestSEC004ReportDedup:
    @pytest.fixture(scope="class")
    def seeded_post_id(self, mdb):
        pid = str(uuid.uuid4())
        mdb.posts.insert_one({
            "id": pid,
            "location_id": "patavala",
            "user_id": "TEST_sec_u",
            "title": "TEST_sec_post",
            "body": "sec audit body",
            "image_path": None,
            "posted_at": "2026-01-01T00:00:00+00:00",
            "reports": 0,
            "hidden": False,
            "author_name": "TEST_sec_u",
            "author_picture": None,
            "reactions": {"pray": 0, "heart": 0, "alert": 0},
        })
        yield pid
        # cleanup
        mdb.posts.delete_many({"id": pid})
        mdb.post_reports.delete_many({"post_id": pid})

    def test_first_report_ok(self, s, seeded_post_id, mdb):
        r = s.post(f"{API}/posts/{seeded_post_id}/report", json={"device_id": "same-device"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["status"] == "ok"
        assert j["reports"] == 1

    def test_duplicate_device_dedup(self, s, seeded_post_id, mdb):
        for i in range(5):
            r = s.post(f"{API}/posts/{seeded_post_id}/report", json={"device_id": "same-device"})
            assert r.status_code == 200, r.text
            j = r.json()
            assert j["status"] == "already_reported", f"iter {i}: {j}"
        # reports still == 1 in DB
        post = mdb.posts.find_one({"id": seeded_post_id})
        assert post["reports"] == 1

    def test_five_unique_devices_hide_post(self, s, seeded_post_id, mdb):
        # 4 more unique device_ids -> total 5 unique -> hide
        for i in range(1, 5):
            r = s.post(f"{API}/posts/{seeded_post_id}/report", json={"device_id": f"d{i}"})
            assert r.status_code == 200, r.text
            assert r.json()["status"] == "ok"

        post = mdb.posts.find_one({"id": seeded_post_id})
        assert post["hidden"] is True, f"post not hidden: reports={post.get('reports')}"
        assert post["reports"] >= 5

        # not present in public listing
        r = s.get(f"{API}/posts", params={"location_id": "patavala"})
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert seeded_post_id not in ids

    def test_no_hidden_if_field_anywhere(self, mdb):
        stray = mdb.posts.count_documents({"hidden_if": {"$exists": True}})
        assert stray == 0, f"{stray} posts still carry stray 'hidden_if' field"


# =====================================================================
# SEC-005 — /register-push identity is server-derived (anon_<sha256>)
# =====================================================================
class TestSEC005PushIdentity:
    def test_anonymous_registration_uses_server_derived_user_id(self, s, mdb):
        device_token = "tok_ABCDEF1234567890"
        expected_uid = "anon_" + hashlib.sha256(device_token.encode()).hexdigest()[:16]

        # Remove any previous row for this token so we observe the fresh upsert
        mdb.push_tokens.delete_many({"device_token": device_token})

        r = s.post(f"{API}/register-push", json={
            "user_id": "victim_user",  # attacker-supplied; must be ignored
            "platform": "android",
            "device_token": device_token,
        })
        assert r.status_code == 201, r.text

        row = mdb.push_tokens.find_one({"device_token": device_token})
        assert row is not None, "push_tokens row not persisted"
        assert row["user_id"].startswith("anon_"), f"user_id={row['user_id']!r}"
        assert row["user_id"] != "victim_user"
        assert row["user_id"] == expected_uid, (
            f"expected {expected_uid}, got {row['user_id']}"
        )

        # cleanup
        mdb.push_tokens.delete_many({"device_token": device_token})


# =====================================================================
# Non-regression sanity
# =====================================================================
class TestSanity:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        j = r.json()
        assert j == {"app": "Mana Ooru", "status": "ok"}, j

    def test_locations(self, s):
        r = s.get(f"{API}/locations")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) == 1
        assert rows[0]["id"] == "patavala"
        assert rows[0]["district_en"] == "Kakinada–Yanam Road"
        _no_underscore_id(rows)

    def test_businesses_count(self, s):
        r = s.get(f"{API}/businesses", params={"location_id": "patavala"})
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) == 27, f"expected 27, got {len(rows)}"
        _no_underscore_id(rows)

    def test_buses_count(self, s):
        r = s.get(f"{API}/buses", params={"location_id": "patavala"})
        assert r.status_code == 200
        d = r.json()
        assert len(d["buses"]) == 6, f"expected 6, got {len(d['buses'])}"
        _no_underscore_id(d)

    def test_auth_session_garbage(self, s):
        r = s.post(f"{API}/auth/session", json={"session_id": "garbage"})
        assert r.status_code == 401
