from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app import auth, store
from app.main import app

client = TestClient(app)
anon = TestClient(app)


def login():
    r = anon.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    client.headers["Authorization"] = "Bearer " + r.json()["access_token"]


def at(h, m=0, days=0):
    return datetime(2026, 1, 10, h, m, tzinfo=store.TZ) + timedelta(days=days)


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    store._checked_in = None
    auth._tokens.clear()
    auth._fails.clear()
    monkeypatch.setattr(store, "now", lambda: at(14, 47))
    login()
    yield
    store._checked_in = None
    auth._tokens.clear()
    auth._fails.clear()


def set_now(monkeypatch, t):
    monkeypatch.setattr(store, "now", lambda: t)


def test_dashboard_fields_and_apps():
    d = client.get("/api/dashboard").json()
    assert d["user"]["id"] == "u1"
    assert d["attendance"] == {"shift_start": "08:30", "checked_in_at": None}
    assert d["notifications"] == {"unread_count": 3}
    assert [a["id"] for a in d["pinned_apps"]] == [
        "cong-viec", "de-xuat", "tuyen-dung", "hanh-chinh", "cham-cong",
        "ho-so", "tinh-luong", "bao-cao", "kho", "cai-dat",
    ]


def test_events_filter(monkeypatch):
    ids = lambda: [e["id"] for e in client.get("/api/dashboard").json()["events_today"]]
    assert ids() == ["e2"]
    set_now(monkeypatch, at(8))
    assert ids() == ["e1", "e2"]
    set_now(monkeypatch, at(17))
    assert ids() == []


def test_check_in_and_dashboard():
    r = client.post("/api/attendance/check-in")
    assert r.status_code == 200
    assert r.json() == {"shift_start": "08:30", "checked_in_at": "14:47"}
    assert client.get("/api/dashboard").json()["attendance"]["checked_in_at"] == "14:47"


def test_check_in_twice_409(monkeypatch):
    client.post("/api/attendance/check-in")
    set_now(monkeypatch, at(15))
    r = client.post("/api/attendance/check-in")
    assert r.status_code == 409
    assert r.json() == {"detail": "Bạn đã chấm vào hôm nay"}
    assert client.get("/api/dashboard").json()["attendance"]["checked_in_at"] == "14:47"


def test_new_day_resets(monkeypatch):
    client.post("/api/attendance/check-in")
    set_now(monkeypatch, at(9, 0, days=1))
    login()
    assert client.get("/api/dashboard").json()["attendance"]["checked_in_at"] is None
    assert client.post("/api/attendance/check-in").json()["checked_in_at"] == "09:00"


def test_cors_preflight():
    r = client.options(
        "/api/attendance/check-in",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_login_ok():
    r = anon.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer" and r.json()["access_token"]


def test_login_wrong_same_detail():
    a = anon.post("/api/auth/login", json={"username": "demo", "password": "x"})
    b = anon.post("/api/auth/login", json={"username": "nobody", "password": "demo123"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json() == {"detail": "Sai tên đăng nhập hoặc mật khẩu"}


@pytest.mark.parametrize("h", [{}, {"Authorization": "Bearer sai"}, {"Authorization": "Basic ZGVtbzpkZW1vMTIz"}])
def test_dashboard_401(h):
    r = anon.get("/api/dashboard", headers=h)
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"
    assert r.json() == {"detail": "Chưa đăng nhập hoặc phiên đã hết hạn"}


def test_check_in_csrf_401():
    r = anon.post("/api/attendance/check-in", headers={"Origin": "http://evil.example", "Content-Type": "text/plain"})
    assert r.status_code == 401
    assert store._checked_in is None


def test_unauth_check_in_after_checked_is_401():
    client.post("/api/attendance/check-in")
    assert anon.post("/api/attendance/check-in").status_code == 401


def test_token_expires(monkeypatch):
    assert client.get("/api/dashboard").status_code == 200
    set_now(monkeypatch, at(14, 47) + auth.TOKEN_TTL)
    assert client.get("/api/dashboard").status_code == 401


def test_logout_revokes():
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/dashboard").status_code == 401
    assert client.post("/api/auth/logout").status_code == 401


def test_cors_preflight_authorization_header():
    r = client.options(
        "/api/dashboard",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert r.status_code == 200
    assert "authorization" in r.headers["access-control-allow-headers"].lower()
