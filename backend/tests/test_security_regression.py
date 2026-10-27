from datetime import datetime, timedelta
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import auth, store
from app.main import app

ROOT = Path(__file__).resolve().parents[2]
anon = TestClient(app)


@pytest.fixture(autouse=True)
def reset():
    store._checked_in = None
    auth._tokens.clear()
    auth._fails.clear()
    yield
    store._checked_in = None
    auth._tokens.clear()
    auth._fails.clear()


def test_bm01_csrf_simple_post_blocked():
    r = anon.post("/api/attendance/check-in", headers={"Origin": "http://evil.example", "Content-Type": "text/plain"})
    assert r.status_code == 401
    assert store._checked_in is None


def test_bm01_login_then_check_in_ok_and_missing_body_login_422():
    t = anon.post("/api/auth/login", json={"username": "demo", "password": "demo123"}).json()["access_token"]
    assert anon.post("/api/attendance/check-in", headers={"Authorization": "Bearer " + t}).status_code == 200
    assert anon.post("/api/auth/login", json={}).status_code == 422


def test_bm02_nginx_security_headers():
    c = (ROOT / "frontend/nginx.conf").read_text()
    assert "server_tokens off;" in c
    for h in ["X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Content-Security-Policy"]:
        assert re.search(r"add_header\s+" + h + r"\s+\"[^\"]*\"\s+always;", c), h
    assert 'X-Frame-Options "DENY"' in c and 'nosniff' in c
    assert "frame-ancestors 'none'" in c
    assert "connect-src 'self' http://localhost:8000" in c


def test_bm03_ports_bound_to_loopback():
    ports = re.findall(r'-\s*"([^"]+:\d+)"', (ROOT / "docker-compose.yml").read_text())
    assert len(ports) == 2 and all(p.startswith("127.0.0.1:") for p in ports)


def test_bm04_pinned_deps_and_dev_split():
    req = (ROOT / "backend/requirements.txt").read_text().split()
    assert req and all("==" in x for x in req)
    assert not any(x.startswith(("pytest", "httpx")) for x in req)
    dev = (ROOT / "backend/requirements-dev.txt").read_text()
    assert "-r requirements.txt" in dev and "pytest==" in dev and "httpx==" in dev


def test_bm04_docker_tags_pinned_and_no_dev_install():
    froms = re.findall(r"^FROM\s+(\S+)", (ROOT / "backend/Dockerfile").read_text() + (ROOT / "frontend/Dockerfile").read_text(), re.M)
    assert len(froms) == 3
    for f in froms:
        tag = f.split(":", 1)[1]
        assert re.search(r"\d+\.\d+", tag) and tag != "latest", f
    assert "requirements-dev" not in (ROOT / "backend/Dockerfile").read_text()


# --- BM-05: giới hạn đăng nhập sai ---
BAD = {"username": "demo", "password": "sai"}
GOOD = {"username": "demo", "password": "demo123"}
LIMIT_MSG = "Thử đăng nhập quá nhiều lần, vui lòng thử lại sau"


@pytest.fixture
def clock(monkeypatch):
    t = [datetime(2026, 1, 10, 9, 0, tzinfo=store.TZ)]
    monkeypatch.setattr(store, "now", lambda: t[0])
    return t


def fail5(c=anon, user="demo"):
    for _ in range(5):
        assert c.post("/api/auth/login", json={"username": user, "password": "sai"}).status_code == 401


def test_bm05_sixth_attempt_429_with_retry_after(clock):
    fail5()
    r = anon.post("/api/auth/login", json=BAD)
    assert r.status_code == 429
    assert r.json()["detail"] == LIMIT_MSG
    assert 1 <= int(r.headers["Retry-After"]) <= 900


def test_bm05_correct_password_still_429_when_blocked(clock):
    fail5()
    assert anon.post("/api/auth/login", json=GOOD).status_code == 429


def test_bm05_blocked_skips_pbkdf2(clock, monkeypatch):
    fail5()
    calls = []
    monkeypatch.setattr(auth.hashlib, "pbkdf2_hmac", lambda *a, **k: calls.append(1))
    assert anon.post("/api/auth/login", json=BAD).status_code == 429
    assert calls == []


def test_bm05_429_not_counted_and_window_expires(clock):
    fail5()
    for _ in range(3):
        assert anon.post("/api/auth/login", json=BAD).status_code == 429
    assert len(auth._fails["u:demo"]) == 5
    clock[0] += timedelta(minutes=15, seconds=1)
    assert anon.post("/api/auth/login", json=GOOD).status_code == 200


def test_bm05_success_clears_counter(clock):
    for _ in range(4):
        assert anon.post("/api/auth/login", json=BAD).status_code == 401
    assert anon.post("/api/auth/login", json=GOOD).status_code == 200
    fail5()


def test_bm05_ip_key(clock):
    for i in range(5):
        assert anon.post("/api/auth/login", json={"username": f"x{i}", "password": "sai"}).status_code == 401
    assert anon.post("/api/auth/login", json=GOOD).status_code == 429
    other = TestClient(app, client=("10.0.0.2", 50000))
    assert other.post("/api/auth/login", json=GOOD).status_code == 200


def test_bm05_username_key(clock):
    fail5()
    other = TestClient(app, client=("10.0.0.3", 50000))
    assert other.post("/api/auth/login", json=GOOD).status_code == 429


def test_bm05_ignores_x_forwarded_for(clock):
    for i in range(5):
        assert anon.post("/api/auth/login", json={"username": f"y{i}", "password": "sai"}, headers={"X-Forwarded-For": f"9.9.9.{i}"}).status_code == 401
    assert anon.post("/api/auth/login", json=GOOD, headers={"X-Forwarded-For": "8.8.8.8"}).status_code == 429


# --- BM-06: giới hạn độ dài + dọn khoá cũ ---
def test_bm06_too_long_422_no_counter_no_pbkdf2(clock, monkeypatch):
    calls = []
    monkeypatch.setattr(auth.hashlib, "pbkdf2_hmac", lambda *a, **k: calls.append(1))
    assert anon.post("/api/auth/login", json={"username": "a" * 65, "password": "x"}).status_code == 422
    assert anon.post("/api/auth/login", json={"username": "demo", "password": "x" * 257}).status_code == 422
    assert auth._fails == {} and calls == []


def test_bm06_max_length_is_401(clock):
    assert anon.post("/api/auth/login", json={"username": "a" * 64, "password": "x" * 256}).status_code == 401


def test_bm06_stale_keys_swept(clock):
    assert anon.post("/api/auth/login", json={"username": "ghost", "password": "x"}).status_code == 401
    assert "u:ghost" in auth._fails
    clock[0] += timedelta(minutes=15, seconds=1)
    assert anon.post("/api/auth/login", json={"username": "other", "password": "x"}).status_code == 401
    assert "u:ghost" not in auth._fails


# --- BM-07: race condition ---
def test_bm07_parallel_attempts_capped_at_5(clock):
    from concurrent.futures import ThreadPoolExecutor

    def hit(i):
        return TestClient(app).post("/api/auth/login", json={"username": "demo", "password": f"g{i}"}).status_code

    with ThreadPoolExecutor(20) as ex:
        codes = list(ex.map(hit, range(20)))
    assert codes.count(401) == 5 and codes.count(429) == 15


# --- BM-08: proxy headers ---
def test_bm08_proxy_headers_would_spoof_ip(clock):
    # TestClient không đi qua middleware của uvicorn nên test_bm05_ignores_x_forwarded_for không kiểm được BM-08.
    # Ở đây bọc đúng middleware mà uvicorn bật mặc định: nó ghi đè client.host bằng X-Forwarded-For
    # => lý do bắt buộc chạy với --no-proxy-headers (Dockerfile + lệnh dev trong ke-hoach.md).
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    spoofed = TestClient(ProxyHeadersMiddleware(app, trusted_hosts="*"), client=("127.0.0.1", 50000))
    for i in range(6):
        assert spoofed.post("/api/auth/login", json={"username": f"s{i}", "password": "x"}, headers={"X-Forwarded-For": f"10.0.0.{i}"}).status_code == 401
    assert "ip:127.0.0.1" not in auth._fails and "ip:10.0.0.5" in auth._fails


def test_bm08_dockerfile_cmd_has_no_proxy_headers():
    cmd = [l for l in (ROOT / "backend/Dockerfile").read_text().splitlines() if l.startswith("CMD")]
    assert len(cmd) == 1 and "--no-proxy-headers" in cmd[0]
