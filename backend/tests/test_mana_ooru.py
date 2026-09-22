"""Backend API tests for Mana Ooru MVP."""
import os
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


# --- Root ---
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json() == {"app": "Mana Ooru", "status": "ok"}


# --- Locations ---
def test_locations_list(s):
    r = s.get(f"{API}/locations")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) == 3
    ids = {x["id"] for x in data}
    assert "patavala" in ids
    for loc in data:
        assert loc.get("name_te")
    _no_underscore_id(data)


def test_location_patavala(s):
    r = s.get(f"{API}/locations/patavala")
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == "patavala"
    assert d["name_en"] == "Patavala"
    assert d["name_te"] == "పటవల"
    _no_underscore_id(d)


def test_location_not_found(s):
    r = s.get(f"{API}/locations/does-not-exist")
    assert r.status_code == 404


# --- Emergency ---
def test_emergency(s):
    r = s.get(f"{API}/emergency")
    assert r.status_code == 200
    d = r.json()
    nums = {x["number"] for x in d}
    for n in ["108", "100", "101", "1091", "1098", "112"]:
        assert n in nums, f"missing emergency number {n}"
    _no_underscore_id(d)


# --- Businesses ---
def test_businesses_health(s):
    r = s.get(f"{API}/businesses", params={"location_id": "patavala", "section": "health"})
    assert r.status_code == 200
    d = r.json()
    cats = {b["category"] for b in d}
    for c in ["pharmacy", "hospital", "doctor", "ambulance", "lab", "dental", "eye"]:
        assert c in cats, f"missing health category {c}"
    _no_underscore_id(d)


def test_businesses_pharmacy_filter(s):
    r = s.get(f"{API}/businesses", params={"location_id": "patavala", "section": "health", "category": "pharmacy"})
    assert r.status_code == 200
    d = r.json()
    assert len(d) >= 3
    for b in d:
        assert b["category"] == "pharmacy"


def test_businesses_transport(s):
    r = s.get(f"{API}/businesses", params={"location_id": "patavala", "section": "transport"})
    assert r.status_code == 200
    cats = {b["category"] for b in r.json()}
    for c in ["bus", "auto", "train"]:
        assert c in cats


def test_businesses_government(s):
    r = s.get(f"{API}/businesses", params={"location_id": "patavala", "section": "government"})
    assert r.status_code == 200
    cats = {b["category"] for b in r.json()}
    for c in ["panchayat", "meeseva", "post", "bank"]:
        assert c in cats


# --- Updates ---
def test_updates(s):
    r = s.get(f"{API}/updates", params={"location_id": "patavala"})
    assert r.status_code == 200
    d = r.json()
    assert len(d) >= 3
    for u in d:
        assert u.get("title_te") and u.get("body_te")
    _no_underscore_id(d)


# --- Search ---
def test_search_pharmacy(s):
    r = s.post(f"{API}/search", json={"query": "find a pharmacy", "location_id": "patavala", "lang": "en"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"]["section"] == "health"
    assert len(d["businesses"]) >= 1
    # At least one pharmacy
    cats = {b["category"] for b in d["businesses"]}
    assert "pharmacy" in cats
    _no_underscore_id(d)


def test_search_telugu(s):
    r = s.post(f"{API}/search", json={"query": "బస్", "location_id": "patavala", "lang": "te"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"]["section"] in ("transport", None)
