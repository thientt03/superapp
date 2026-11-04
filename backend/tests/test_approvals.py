import base64
import json

import pytest

from app import db
from tests.test_tasks import anon, client, reset  # noqa: F401  (reset: autouse fixture)

NF = {"detail": "Không tìm thấy yêu cầu phê duyệt"}


def flow(doc, *ids):
    with db.pool().connection() as conn:
        conn.execute("DELETE FROM approval_flow_steps WHERE doc_type = %s", (doc,))
        for n, a in enumerate(ids, 1):
            conn.execute("INSERT INTO approval_flow_steps VALUES (%s, %s, %s)", (doc, n, a))


def mk(requester="u2", doc="de_nghi_mua", title="t", **kw):
    """Chụp chuỗi duyệt hiện tại vào một yêu cầu mới, chèn trực tiếp DB."""
    with db.pool().connection() as conn:
        i = conn.execute(
            "INSERT INTO approval_requests (doc_type, title, requester_id, current_level, amount)"
            " VALUES (%s, %s, %s, 1, 100) RETURNING id",
            (doc, title, requester),
        ).fetchone()["id"]
        conn.execute(
            "INSERT INTO approval_steps (request_id, level, approver_id)"
            " SELECT %s, level, approver_id FROM approval_flow_steps WHERE doc_type = %s",
            (i, doc),
        )
    return i


@pytest.fixture
def who():
    from app import main

    def _set(uid):
        main.app.dependency_overrides[main.current_user] = lambda: uid

    yield _set
    main.app.dependency_overrides.clear()


def test_all_routes_require_token():
    calls = [
        ("get", "/api/approval-types"), ("put", "/api/approval-types/khac/steps"),
        ("get", "/api/approvals"), ("get", "/api/approvals/1"), ("post", "/api/approvals"),
        ("post", "/api/approvals/1/approve"), ("post", "/api/approvals/1/reject"),
        ("post", "/api/approvals/1/cancel"),
    ]
    for m, url in calls:
        assert getattr(anon, m)(url).status_code == 401, url


def test_types_and_put_flow(who):
    d = client.get("/api/approval-types").json()
    assert d["can_edit"] is True and [t["code"] for t in d["items"]][:2] == ["bao_gia", "hoa_don"]
    url = "/api/approval-types/khac/steps"
    r = client.put(url, json={"approver_ids": ["u2", "u3"]})
    assert r.status_code == 200 and [s["approver"]["id"] for s in r.json()["steps"]] == ["u2", "u3"]
    assert client.put("/api/approval-types/zzz/steps", json={"approver_ids": []}).status_code == 404
    assert client.put(url, json={"approver_ids": ["u2", "u2"]}).json() == {"detail": "Một người không được duyệt hai cấp"}
    assert client.put(url, json={"approver_ids": ["nope"]}).json() == {"detail": "Người duyệt không tồn tại"}
    assert client.put(url, json={"approver_ids": list("abcdef")}).status_code == 422
    assert client.put(url, json={"approver_ids": [], "x": 1}).status_code == 422
    assert client.put(url, json={"approver_ids": []}).json()["steps"] == []
    # không phải admin: 403 đứng trước 404
    with db.pool().connection() as conn:
        conn.execute("UPDATE employees SET is_admin = false WHERE id = 'u1'")
    try:
        assert client.get("/api/approval-types").json()["can_edit"] is False
        for code in ("khac", "zzz"):
            r = client.put(f"/api/approval-types/{code}/steps", json={"approver_ids": []})
            assert r.status_code == 403
            assert r.json() == {"detail": "Chỉ quản trị viên được sửa cấu hình phê duyệt"}
    finally:
        with db.pool().connection() as conn:
            conn.execute("UPDATE employees SET is_admin = true WHERE id = 'u1'")


def test_create_validation_and_snapshot(who):
    who("u2")
    flow("de_nghi_mua", "u3", "u1")
    flow("hoa_don", "u2")
    flow("nghi_phep", "u3")

    def post(**b):
        r = client.post("/api/approvals", json=b)
        return r.status_code, r.json()

    ok = {"doc_type": "de_nghi_mua", "title": " Mua ", "amount": 5}
    cases = [
        ({"doc_type": "zzz", "title": "a"}, "Loại chứng từ không tồn tại"),
        ({"doc_type": "de_nghi_mua", "title": "a"}, "Loại chứng từ này cần số tiền"),
        ({"doc_type": "nghi_phep", "title": "a", "amount": 1}, "Loại chứng từ này không có số tiền"),
        ({"doc_type": "nghi_phep", "title": "a", "start_date": "2026-01-01"}, "Loại chứng từ này cần ngày bắt đầu và ngày kết thúc"),
        ({**ok, "start_date": "2026-01-01"}, "Loại chứng từ này không có khoảng ngày"),
        ({"doc_type": "nghi_phep", "title": "a", "start_date": "2026-01-02", "end_date": "2026-01-01"}, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"),
        ({"doc_type": "tam_ung", "title": "a", "amount": 1}, "Loại chứng từ chưa được cấu hình quy trình phê duyệt"),
        ({"doc_type": "hoa_don", "title": "a", "amount": 1}, "Bạn là người duyệt trong quy trình của loại chứng từ này nên không thể tự gửi"),
    ]
    with db.pool().connection() as conn:
        conn.execute("DELETE FROM approval_flow_steps WHERE doc_type = 'tam_ung'")
    for body, msg in cases:
        assert post(**body) == (422, {"detail": msg}), msg
    assert post(**ok, extra=1)[0] == 422 and post(**{**ok, "amount": 0})[0] == 422

    code, d = post(**ok, description="", ref_no="")
    assert code == 201 and d["title"] == "Mua" and d["description"] is None and d["ref_no"] is None
    assert (d["status"], d["current_level"], d["can_cancel"], d["can_approve"]) == ("pending", 1, True, False)
    assert [s["approver"]["id"] for s in d["steps"]] == ["u3", "u1"]
    flow("de_nghi_mua", "u4")
    assert [s["approver"]["id"] for s in client.get(f"/api/approvals/{d['id']}").json()["steps"]] == ["u3", "u1"]


def test_three_level_flow(who):
    flow("de_nghi_mua", "u2", "u1", "u4")
    i = mk("u3")
    url = f"/api/approvals/{i}"
    who("u1")
    r = client.post(url + "/approve", json={})
    assert r.status_code == 403 and r.json() == {"detail": "Chưa đến lượt bạn duyệt yêu cầu này"}
    g = client.get(url).json()
    assert g["can_approve"] is False
    assert [x["id"] for x in client.get("/api/approvals").json()["items"]] == []
    assert client.get("/api/dashboard").json()["pending_approval_count"] == 0
    who("u2")
    assert client.get("/api/dashboard").json()["pending_approval_count"] == 1
    r = client.post(url + "/approve", json={"comment": " ok "}).json()
    assert r["current_level"] == 2 and r["steps"][0]["comment"] == "ok" and r["steps"][0]["decided_at"].endswith("+07:00")
    assert client.post(url + "/approve", json={}).status_code == 403
    who("u1")
    assert [x["id"] for x in client.get("/api/approvals").json()["items"]] == [i]
    assert client.get("/api/dashboard").json()["pending_approval_count"] == 1
    assert client.post(url + "/approve", json={"x": 1}).status_code == 422
    client.post(url + "/approve", json={})
    who("u4")
    r = client.post(url + "/approve", json={}).json()
    assert (r["status"], r["current_level"], r["can_approve"]) == ("approved", None, False)
    assert client.post(url + "/approve", json={}).status_code == 409
    assert client.post(url + "/reject", json={"comment": "x"}).json() == {"detail": "Yêu cầu đã được xử lý"}
    who("u3")
    assert client.post(url + "/cancel").status_code == 409


def test_reject_middle_and_cancel(who):
    flow("de_nghi_mua", "u2", "u1", "u4")
    i = mk("u3")
    url = f"/api/approvals/{i}"
    who("u2")
    client.post(url + "/approve", json={})
    who("u1")
    for bad in ({}, {"comment": ""}, {"comment": "   "}):
        assert client.post(url + "/reject", json=bad).status_code == 422
    r = client.post(url + "/reject", json={"comment": "Không"}).json()
    assert r["status"] == "rejected" and r["current_level"] is None
    assert [s["decision"] for s in r["steps"]] == ["approved", "rejected", None]
    j = mk("u3")
    who("u3")
    assert client.post(f"/api/approvals/{j}/approve", json={}).status_code == 403
    who("u2")
    r = client.post(f"/api/approvals/{j}/cancel")
    assert r.status_code == 403 and r.json() == {"detail": "Chỉ người gửi mới được huỷ yêu cầu"}
    who("u3")
    assert client.post(f"/api/approvals/{j}/cancel").json()["status"] == "cancelled"


def test_visibility(who):
    flow("de_nghi_mua", "u2", "u1")
    i = mk("u3")
    who("u4")
    r = client.get(f"/api/approvals/{i}")
    assert r.status_code == 404 and r.json() == NF
    for act in ("approve", "reject", "cancel"):
        assert client.post(f"/api/approvals/{i}/{act}", json={"comment": "x"}).status_code == 404
    assert client.get("/api/approvals/999").status_code == 404


def test_lists_and_pagination(who):
    flow("khac", "u2")
    ids = [mk("u3", doc="khac") for _ in range(5)]
    who("u2")
    seen, cur = [], None
    while True:
        r = client.get("/api/approvals", params={"limit": 2, **({"cursor": cur} if cur else {})}).json()
        seen += [x["id"] for x in r["items"]]
        cur = r["next_cursor"]
        if not cur:
            break
    assert seen == sorted(ids, reverse=True)
    r = client.get("/api/approvals", params={"status": "pending"})
    assert r.status_code == 422 and r.json() == {"detail": "Danh sách chờ tôi duyệt không lọc theo trạng thái"}
    assert client.get("/api/approvals", params={"scope": "x"}).status_code == 422
    assert client.get("/api/approvals", params={"limit": 51}).status_code == 422
    for bad in ("zz", base64.urlsafe_b64encode(json.dumps({"i": "x"}).encode()).decode(),
                base64.urlsafe_b64encode(json.dumps({"i": 1, "d": 1}).encode()).decode(), "a" * 201):
        r = client.get("/api/approvals", params={"cursor": bad})
        assert (r.status_code, r.json()) == (422, {"detail": "Cursor không hợp lệ"})
    who("u3")
    sub = client.get("/api/approvals", params={"scope": "submitted"}).json()["items"]
    assert len(sub) == 5
    assert client.get("/api/approvals", params={"scope": "submitted", "status": "approved"}).json()["items"] == []
    assert len(client.get("/api/approvals", params={"scope": "submitted", "status": "pending"}).json()["items"]) == 5


def test_bm02_amount_strict_int():
    flow("hoa_don", "u3")
    for bad in (True, "100", 2.0):
        r = client.post("/api/approvals", json={"doc_type": "hoa_don", "title": "a", "amount": bad})
        assert r.status_code == 422, bad
        detail = r.json()["detail"]
        assert isinstance(detail, list) and detail[0]["type"] == "int_type", bad
