import base64
import json

from app import db
from tests.test_tasks import client, insert, reset  # noqa: F401  (reset: autouse fixture)


def test_migrate_idempotent():
    with db.pool().connection() as conn:
        db.migrate(conn)
        db.migrate(conn)
        v = [r["version"] for r in conn.execute("SELECT version FROM schema_migrations ORDER BY 1")]
    assert v == ["001_init.sql", "002_seed.sql", "003_approvals.sql", "004_approvals_seed.sql"]


def test_assignee_mixed_patch_forbidden_and_unchanged():
    tid = insert("u2", "u1", title="orig")
    r = client.patch(f"/api/tasks/{tid}", json={"status": "done", "title": "hack"})
    assert r.status_code == 403
    assert r.json() == {"detail": "Bạn chỉ được đổi trạng thái công việc này"}
    got = client.get(f"/api/tasks/{tid}").json()
    assert got["title"] == "orig" and got["status"] == "todo"


def test_cursor_wrong_structure_and_limit_bounds():
    bad = base64.urlsafe_b64encode(json.dumps({"d": 5, "i": "x"}).encode()).decode()
    for c in [bad, "!!!", base64.urlsafe_b64encode(b"[]").decode()]:
        r = client.get("/api/tasks", params={"cursor": c})
        assert r.status_code == 422 and r.json() == {"detail": "Cursor không hợp lệ"}
    for lim in [0, 51]:
        assert client.get("/api/tasks", params={"limit": lim}).status_code == 422


def test_delete_by_assignee_forbidden_keeps_row():
    tid = insert("u2", "u1")
    r = client.delete(f"/api/tasks/{tid}")
    assert r.status_code == 403
    assert client.get(f"/api/tasks/{tid}").status_code == 200


def test_bm01_nul_char_rejected_422():
    for f, v in [("title", "a\x00b"), ("description", "x\x00"), ("assignee_id", "u2\x00")]:
        body = {"title": "t", "assignee_id": "u2", f: v}
        assert client.post("/api/tasks", json=body).status_code == 422, f
        tid = insert("u1", "u2")
        assert client.patch(f"/api/tasks/{tid}", json={f: v}).status_code == 422, f


def test_bm02_cursor_too_long_or_deeply_nested_422():
    c = base64.urlsafe_b64encode(b"[" * 10000).decode()
    r = client.get("/api/tasks", params={"cursor": c})
    assert r.status_code == 422 and r.json() == {"detail": "Cursor không hợp lệ"}


def test_bm02_valid_cursor_still_paginates():
    for _ in range(3):
        insert("u1", "u2")
    r = client.get("/api/tasks", params={"scope": "assigned_by_me", "limit": 1})
    assert r.status_code == 200
    cur = r.json().get("next_cursor")
    assert cur and len(cur) < 200
    assert client.get("/api/tasks", params={"scope": "assigned_by_me", "limit": 1, "cursor": cur}).status_code == 200


def test_current_user_none_after_token_check_returns_401(monkeypatch):
    from app import auth

    real = auth.user_for_token
    calls = []

    def flaky(token):
        calls.append(1)
        return real(token) if len(calls) == 1 else None

    monkeypatch.setattr(auth, "user_for_token", flaky)
    r = client.post("/api/tasks", json={"title": "x", "assignee_id": "u2"})
    assert r.status_code == 401
    assert r.headers["www-authenticate"] == "Bearer"
    assert r.json() == {"detail": "Chưa đăng nhập hoặc phiên đã hết hạn"}
