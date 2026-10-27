import importlib
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app import auth, store
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset():
    store._checked_in = None
    auth._tokens.clear()
    auth._fails.clear()
    token = auth.login("demo", "demo123")
    client.headers["Authorization"] = "Bearer " + token
    yield
    store._checked_in = None
    auth._tokens.clear()
    auth._fails.clear()


def ids(monkeypatch, h, m):
    monkeypatch.setattr(store, "now", lambda: datetime(2026, 1, 10, h, m, tzinfo=store.TZ))
    return [e["id"] for e in client.get("/api/dashboard").json()["events_today"]]


def test_event_end_boundary_inclusive(monkeypatch):
    assert ids(monkeypatch, 16, 30) == ["e2"]
    assert ids(monkeypatch, 16, 31) == []
    assert ids(monkeypatch, 10, 0) == ["e1", "e2"]
    assert ids(monkeypatch, 10, 1) == ["e2"]


def test_cors_origin_not_allowed():
    r = client.options(
        "/api/attendance/check-in",
        headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in r.headers


def test_cors_env_parsing(monkeypatch):
    import app.main as m
    monkeypatch.setenv("CORS_ORIGINS", " http://a.com , ,http://b.com")
    m = importlib.reload(m)
    c = TestClient(m.app)
    for o in ("http://a.com", "http://b.com"):
        r = c.options("/api/dashboard", headers={"Origin": o, "Access-Control-Request-Method": "GET"})
        assert r.headers["access-control-allow-origin"] == o
    r = c.options("/api/dashboard", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in r.headers
    monkeypatch.undo()
    importlib.reload(m)


def test_unknown_route_and_method_fail():
    assert client.get("/api/attendance/check-in").status_code == 405
    assert client.get("/api/nope").status_code == 404
