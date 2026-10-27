from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app import auth, db, store
from app.main import app

client = TestClient(app)
anon = TestClient(app)
NOT_FOUND = {"detail": "Không tìm thấy công việc"}


def login():
    r = anon.post("/api/auth/login", json={"username": "demo", "password": "demo123"})
    client.headers["Authorization"] = "Bearer " + r.json()["access_token"]


def at(days=0):
    return datetime(2026, 1, 10, 14, 47, tzinfo=store.TZ) + timedelta(days=days)


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    auth._tokens.clear()
    auth._fails.clear()
    monkeypatch.setattr(store, "now", lambda: at())
    login()
    yield
    auth._tokens.clear()
    auth._fails.clear()


def insert(assigner, assignee, title="t", due=None, status="todo"):
    with db.pool().connection() as conn:
        return conn.execute(
            "INSERT INTO tasks (title, status, due_date, assigner_id, assignee_id)"
            " VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (title, status, due, assigner, assignee),
        ).fetchone()["id"]


def test_all_endpoints_require_token():
    calls = [
        ("get", "/api/employees"), ("get", "/api/tasks"), ("get", "/api/tasks/1"),
        ("post", "/api/tasks"), ("patch", "/api/tasks/1"), ("delete", "/api/tasks/1"),
    ]
    for m, url in calls:
        r = getattr(anon, m)(url)
        assert r.status_code == 401, url
        assert r.json() == {"detail": "Chưa đăng nhập hoặc phiên đã hết hạn"}
        assert r.headers["www-authenticate"] == "Bearer"


def test_employees():
    r = client.get("/api/employees")
    assert [e["id"] for e in r.json()] == ["u1", "u2", "u3", "u4"]


def test_create_defaults():
    r = client.post("/api/tasks", json={"title": "  Làm gì đó ", "description": "  ", "assignee_id": "u2"})
    assert r.status_code == 201
    t = r.json()
    assert t["title"] == "Làm gì đó" and t["description"] is None
    assert (t["status"], t["priority"], t["due_date"]) == ("todo", "medium", None)
    assert t["assigner"]["id"] == "u1" and t["assignee"]["full_name"] == "Trần Thị B"
    assert t["can_edit"] is True and t["is_overdue"] is False


def test_create_validation():
    ok = {"title": "x", "assignee_id": "u2"}
    for bad in [{**ok, "status": "done"}, {**ok, "foo": 1}, {**ok, "title": "   "}, {**ok, "title": "a" * 201}]:
        assert client.post("/api/tasks", json=bad).status_code == 422
    r = client.post("/api/tasks", json={**ok, "assignee_id": "nope"})
    assert r.status_code == 422 and r.json() == {"detail": "Người được giao không tồn tại"}


def test_pagination_full_walk():
    ids = [
        insert("u2", "u1", due="2026-01-12"), insert("u2", "u1"), insert("u2", "u1", due="2026-01-12"),
        insert("u2", "u1", due="2026-01-05"), insert("u2", "u1"), insert("u2", "u1", due="2026-01-12"),
    ]
    expected = [ids[3], ids[0], ids[2], ids[5], ids[1], ids[4]]
    got, cursor, pages = [], None, 0
    while True:
        r = client.get("/api/tasks", params={"limit": 2, **({"cursor": cursor} if cursor else {})}).json()
        got += [t["id"] for t in r["items"]]
        pages += 1
        cursor = r["next_cursor"]
        if cursor is None:
            break
    assert got == expected and pages == 3


def test_bad_cursor():
    for c in ["rac!!", "e30", "eyJkIjoxLCJpIjoxfQ"]:  # không giải mã được / {} / d sai kiểu
        r = client.get("/api/tasks", params={"cursor": c})
        assert r.status_code == 422 and r.json() == {"detail": "Cursor không hợp lệ"}


def test_query_validation():
    for q in ["scope=x", "status=x", "limit=0", "limit=51"]:
        assert client.get("/api/tasks?" + q).status_code == 422


def test_scope_and_status_filters():
    a = insert("u2", "u1", status="done")
    b = insert("u2", "u1")
    c = insert("u1", "u2")
    ids = lambda **p: [t["id"] for t in client.get("/api/tasks", params=p).json()["items"]]
    assert ids() == [a, b]
    assert ids(status="done") == [a]
    assert ids(scope="assigned_by_me") == [c]


def test_unrelated_is_404():
    t = insert("u2", "u3")
    assert client.get(f"/api/tasks/{t}").json() == NOT_FOUND
    assert client.patch(f"/api/tasks/{t}", json={"status": "done"}).status_code == 404
    assert client.delete(f"/api/tasks/{t}").status_code == 404
    assert client.get("/api/tasks/99999").status_code == 404
    assert client.get("/api/tasks/abc").status_code == 422


def test_assignee_permissions():
    t = insert("u2", "u1")
    r = client.patch(f"/api/tasks/{t}", json={"status": "done"})
    assert r.status_code == 200 and r.json()["status"] == "done" and r.json()["can_edit"] is False
    r = client.patch(f"/api/tasks/{t}", json={"title": "x"})
    assert r.status_code == 403 and r.json() == {"detail": "Bạn chỉ được đổi trạng thái công việc này"}
    r = client.patch(f"/api/tasks/{t}", json={"status": "todo", "priority": "low"})
    assert r.status_code == 403
    r = client.delete(f"/api/tasks/{t}")
    assert r.status_code == 403 and r.json() == {"detail": "Chỉ người giao mới được xoá công việc"}


def test_assigner_can_patch_delete_and_reassign():
    t = client.post("/api/tasks", json={"title": "x", "assignee_id": "u2"}).json()["id"]
    r = client.patch(f"/api/tasks/{t}", json={"title": "y", "assignee_id": "u3", "priority": "high"})
    assert r.status_code == 200 and r.json()["assignee"]["id"] == "u3" and r.json()["title"] == "y"
    assert [x["id"] for x in client.get("/api/tasks?scope=assigned_by_me").json()["items"]] == [t]
    assert client.patch(f"/api/tasks/{t}", json={"assignee_id": "nope"}).json() == {"detail": "Người được giao không tồn tại"}
    assert client.delete(f"/api/tasks/{t}").status_code == 204
    assert client.get(f"/api/tasks/{t}").status_code == 404


def test_self_assigned_has_full_rights():
    t = client.post("/api/tasks", json={"title": "x", "assignee_id": "u1"}).json()["id"]
    assert client.patch(f"/api/tasks/{t}", json={"title": "y"}).status_code == 200
    assert client.delete(f"/api/tasks/{t}").status_code == 204


def test_patch_edge_cases():
    t = client.post("/api/tasks", json={"title": "x", "assignee_id": "u2", "due_date": "2026-02-01", "description": "d"}).json()
    url = f"/api/tasks/{t['id']}"
    r = client.patch(url, json={})
    assert r.status_code == 422 and r.json() == {"detail": "Không có trường nào để cập nhật"}
    for f in ["title", "assignee_id", "priority", "status"]:
        assert client.patch(url, json={f: None}).status_code == 422
    assert client.patch(url, json={"foo": 1}).status_code == 422
    r = client.patch(url, json={"due_date": None, "description": None}).json()
    assert r["due_date"] is None and r["description"] is None
    assert r["updated_at"] >= t["updated_at"]


def test_is_overdue_follows_now(monkeypatch):
    t = client.post("/api/tasks", json={"title": "x", "assignee_id": "u1", "due_date": "2026-01-10"}).json()["id"]
    get = lambda: client.get(f"/api/tasks/{t}").json()["is_overdue"]
    assert get() is False
    monkeypatch.setattr(store, "now", lambda: at(1))
    login()  # token cũ đã quá TTL 12h
    assert get() is True
    client.patch(f"/api/tasks/{t}", json={"status": "done"})
    assert get() is False


def test_dashboard_my_task():
    d = client.get("/api/dashboard").json()
    assert d["my_task"] is None and "events_today" in d
    insert("u2", "u1", title="muộn", due="2026-03-01")
    insert("u2", "u1", title="gần", due="2026-02-01")
    insert("u2", "u1", title="xong", due="2026-01-01", status="done")
    insert("u2", "u1", title="không hạn")
    d = client.get("/api/dashboard").json()
    assert d["my_task"]["title"] == "gần" and "events_today" in d
