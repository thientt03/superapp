import base64
import binascii
import json

from app import db, store
from app.schemas import (
    ApprovalCreate,
    ApprovalPage,
    ApprovalRequest,
    ApprovalStep,
    ApprovalType,
    ApprovalTypeList,
    Employee,
    FlowStep,
)

SELECT = """
SELECT r.*, t.name AS doc_type_name, e.full_name AS rq_name, e.avatar_url AS rq_avatar
FROM approval_requests r
JOIN approval_doc_types t ON t.code = r.doc_type
JOIN employees e ON e.id = r.requester_id
"""
# người gọi là người gửi hoặc có mặt trong chuỗi duyệt
VISIBLE = "(r.requester_id = %s OR EXISTS (SELECT 1 FROM approval_steps s WHERE s.request_id = r.id AND s.approver_id = %s))"
# người gọi là người duyệt của cấp hiện tại
TURN = (
    "(r.status = 'pending' AND EXISTS (SELECT 1 FROM approval_steps s"
    " WHERE s.request_id = r.id AND s.level = r.current_level AND s.approver_id = %s))"
)
DONE = "Yêu cầu đã được xử lý"


class ApprovalNotFound(Exception):
    pass


class ApprovalForbidden(Exception):
    pass


class ApprovalConflict(Exception):
    pass


class ApprovalInvalid(Exception):
    pass


class DocTypeNotFound(Exception):
    pass


class InvalidCursor(Exception):
    pass


def _emp(r: dict, p: str) -> Employee:
    return Employee(id=r[p + "id"], full_name=r[p + "name"], avatar_url=r[p + "avatar"])


def _steps(conn, ids: list[int]) -> dict[int, list[dict]]:
    out: dict[int, list[dict]] = {i: [] for i in ids}
    rows = conn.execute(
        "SELECT s.*, e.full_name AS ap_name, e.avatar_url AS ap_avatar, s.approver_id AS ap_id"
        " FROM approval_steps s JOIN employees e ON e.id = s.approver_id"
        " WHERE s.request_id = ANY(%s) ORDER BY s.request_id, s.level",
        (ids,),
    ).fetchall()
    for r in rows:
        out[r["request_id"]].append(r)
    return out


def _build(conn, rows: list[dict], user_id: str) -> list[ApprovalRequest]:
    by_req = _steps(conn, [r["id"] for r in rows])
    items = []
    for r in rows:
        steps = by_req[r["id"]]
        pending = r["status"] == "pending"
        items.append(
            ApprovalRequest(
                id=r["id"],
                doc_type=r["doc_type"],
                doc_type_name=r["doc_type_name"],
                title=r["title"],
                description=r["description"],
                ref_no=r["ref_no"],
                amount=r["amount"],
                start_date=r["start_date"].isoformat() if r["start_date"] else None,
                end_date=r["end_date"].isoformat() if r["end_date"] else None,
                status=r["status"],
                current_level=r["current_level"],
                requester=_emp({**r, "rq_id": r["requester_id"]}, "rq_"),
                steps=[
                    ApprovalStep(
                        level=s["level"],
                        approver=_emp(s, "ap_"),
                        decision=s["decision"],
                        comment=s["comment"],
                        decided_at=s["decided_at"].astimezone(store.TZ).isoformat() if s["decided_at"] else None,
                    )
                    for s in steps
                ],
                can_approve=pending
                and any(s["level"] == r["current_level"] and s["approver_id"] == user_id for s in steps),
                can_cancel=pending and r["requester_id"] == user_id,
                created_at=r["created_at"].astimezone(store.TZ).isoformat(),
                updated_at=r["updated_at"].astimezone(store.TZ).isoformat(),
            )
        )
    return items


def _row(conn, user_id: str, request_id: int, lock: bool = False) -> dict:
    # FOR UPDATE OF r: khoá dòng yêu cầu, tránh duyệt/huỷ chồng nhau
    sql = f"{SELECT} WHERE r.id = %s AND {VISIBLE}" + (" FOR UPDATE OF r" if lock else "")
    r = conn.execute(sql, (request_id, user_id, user_id)).fetchone()
    if r is None:
        raise ApprovalNotFound
    return r


def _one(conn, user_id: str, request_id: int) -> ApprovalRequest:
    return _build(conn, [_row(conn, user_id, request_id)], user_id)[0]


def _types(conn, code: str | None = None) -> list[ApprovalType]:
    rows = conn.execute(
        "SELECT * FROM approval_doc_types WHERE %s::text IS NULL OR code = %s ORDER BY sort_order", (code, code)
    ).fetchall()
    flow = conn.execute(
        "SELECT f.doc_type, f.level, e.id, e.full_name, e.avatar_url FROM approval_flow_steps f"
        " JOIN employees e ON e.id = f.approver_id ORDER BY f.doc_type, f.level"
    ).fetchall()
    return [
        ApprovalType(
            code=t["code"],
            name=t["name"],
            has_amount=t["has_amount"],
            has_date_range=t["has_date_range"],
            steps=[
                FlowStep(
                    level=f["level"],
                    approver=Employee(id=f["id"], full_name=f["full_name"], avatar_url=f["avatar_url"]),
                )
                for f in flow
                if f["doc_type"] == t["code"]
            ],
        )
        for t in rows
    ]


def list_types(user_id: str) -> ApprovalTypeList:
    with db.pool().connection() as conn:
        admin = conn.execute("SELECT is_admin FROM employees WHERE id = %s", (user_id,)).fetchone()
        return ApprovalTypeList(can_edit=bool(admin and admin["is_admin"]), items=_types(conn))


def update_flow(user_id: str, code: str, approver_ids: list[str]) -> ApprovalType:
    with db.pool().connection() as conn:
        me = conn.execute("SELECT is_admin FROM employees WHERE id = %s", (user_id,)).fetchone()
        if not (me and me["is_admin"]):
            raise ApprovalForbidden("Chỉ quản trị viên được sửa cấu hình phê duyệt")
        # khoá dòng loại: tránh PUT chồng nhau và tạo yêu cầu đọc chuỗi nửa chừng
        if conn.execute("SELECT 1 FROM approval_doc_types WHERE code = %s FOR UPDATE", (code,)).fetchone() is None:
            raise DocTypeNotFound
        if len(set(approver_ids)) != len(approver_ids):
            raise ApprovalInvalid("Một người không được duyệt hai cấp")
        found = conn.execute("SELECT id FROM employees WHERE id = ANY(%s)", (approver_ids,)).fetchall()
        if len(found) != len(approver_ids):
            raise ApprovalInvalid("Người duyệt không tồn tại")
        conn.execute("DELETE FROM approval_flow_steps WHERE doc_type = %s", (code,))
        for level, a in enumerate(approver_ids, 1):
            conn.execute(
                "INSERT INTO approval_flow_steps (doc_type, level, approver_id) VALUES (%s, %s, %s)", (code, level, a)
            )
        return _types(conn, code)[0]


def _encode(r: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps({"i": r["id"]}).encode()).decode()


def _decode(cursor: str) -> int:
    if len(cursor) > 200:
        raise InvalidCursor
    try:
        o = json.loads(base64.urlsafe_b64decode(cursor.encode("ascii")))
        if set(o) != {"i"} or type(o["i"]) is not int:
            raise ValueError
        return o["i"]
    except (ValueError, KeyError, TypeError, binascii.Error, RecursionError):
        raise InvalidCursor


def list_requests(user_id: str, scope: str, status: str | None, limit: int, cursor: str | None) -> ApprovalPage:
    if scope == "to_approve":
        if status:
            raise ApprovalInvalid("Danh sách chờ tôi duyệt không lọc theo trạng thái")
        where, params = [TURN], [user_id]
    else:
        where, params = ["r.requester_id = %s"], [user_id]
        if status:
            where.append("r.status = %s")
            params.append(status)
    if cursor:
        where.append("r.id < %s")
        params.append(_decode(cursor))
    sql = f"{SELECT} WHERE {' AND '.join(where)} ORDER BY r.id DESC LIMIT %s"
    with db.pool().connection() as conn:
        rows = conn.execute(sql, (*params, limit + 1)).fetchall()
        page = rows[:limit]
        return ApprovalPage(
            items=_build(conn, page, user_id),
            next_cursor=_encode(page[-1]) if len(rows) > limit else None,
        )


def get_request(user_id: str, request_id: int) -> ApprovalRequest:
    with db.pool().connection() as conn:
        return _one(conn, user_id, request_id)


def create_request(user_id: str, body: ApprovalCreate) -> ApprovalRequest:
    with db.pool().connection() as conn:
        t = conn.execute("SELECT * FROM approval_doc_types WHERE code = %s FOR SHARE", (body.doc_type,)).fetchone()
        if t is None:
            raise ApprovalInvalid("Loại chứng từ không tồn tại")
        if t["has_amount"] and body.amount is None:
            raise ApprovalInvalid("Loại chứng từ này cần số tiền")
        if not t["has_amount"] and body.amount is not None:
            raise ApprovalInvalid("Loại chứng từ này không có số tiền")
        both = body.start_date is not None and body.end_date is not None
        if t["has_date_range"] and not both:
            raise ApprovalInvalid("Loại chứng từ này cần ngày bắt đầu và ngày kết thúc")
        if not t["has_date_range"] and (body.start_date is not None or body.end_date is not None):
            raise ApprovalInvalid("Loại chứng từ này không có khoảng ngày")
        if both and body.end_date < body.start_date:
            raise ApprovalInvalid("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu")
        flow = conn.execute(
            "SELECT level, approver_id FROM approval_flow_steps WHERE doc_type = %s ORDER BY level", (body.doc_type,)
        ).fetchall()
        if not flow:
            raise ApprovalInvalid("Loại chứng từ chưa được cấu hình quy trình phê duyệt")
        if any(f["approver_id"] == user_id for f in flow):
            raise ApprovalInvalid("Bạn là người duyệt trong quy trình của loại chứng từ này nên không thể tự gửi")
        new_id = conn.execute(
            "INSERT INTO approval_requests (doc_type, title, description, ref_no, amount, start_date, end_date,"
            " requester_id, current_level) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1) RETURNING id",
            (
                body.doc_type, body.title, body.description or None, body.ref_no or None,
                body.amount, body.start_date, body.end_date, user_id,
            ),
        ).fetchone()["id"]
        conn.execute(
            "INSERT INTO approval_steps (request_id, level, approver_id)"
            " SELECT %s, level, approver_id FROM approval_flow_steps WHERE doc_type = %s",
            (new_id, body.doc_type),
        )
        return _one(conn, user_id, new_id)


def _decide(user_id: str, request_id: int, decision: str, comment: str | None) -> ApprovalRequest:
    with db.pool().connection() as conn:
        r = _row(conn, user_id, request_id, lock=True)
        if r["status"] != "pending":
            raise ApprovalConflict(DONE)
        lvl = r["current_level"]
        cur = conn.execute(
            "SELECT approver_id, (SELECT max(level) FROM approval_steps WHERE request_id = %s) AS last"
            " FROM approval_steps WHERE request_id = %s AND level = %s",
            (request_id, request_id, lvl),
        ).fetchone()
        if cur["approver_id"] != user_id:
            raise ApprovalForbidden("Chưa đến lượt bạn duyệt yêu cầu này")
        conn.execute(
            "UPDATE approval_steps SET decision = %s, comment = %s, decided_at = now()"
            " WHERE request_id = %s AND level = %s",
            (decision, comment or None, request_id, lvl),
        )
        if decision == "rejected":
            status, nxt = "rejected", None
        elif lvl == cur["last"]:
            status, nxt = "approved", None
        else:
            status, nxt = "pending", lvl + 1
        conn.execute(
            "UPDATE approval_requests SET status = %s, current_level = %s, updated_at = now() WHERE id = %s",
            (status, nxt, request_id),
        )
        return _one(conn, user_id, request_id)


def approve(user_id: str, request_id: int, comment: str | None) -> ApprovalRequest:
    return _decide(user_id, request_id, "approved", comment)


def reject(user_id: str, request_id: int, comment: str) -> ApprovalRequest:
    return _decide(user_id, request_id, "rejected", comment)


def cancel(user_id: str, request_id: int) -> ApprovalRequest:
    with db.pool().connection() as conn:
        r = _row(conn, user_id, request_id, lock=True)
        if r["status"] != "pending":
            raise ApprovalConflict(DONE)
        if r["requester_id"] != user_id:
            raise ApprovalForbidden("Chỉ người gửi mới được huỷ yêu cầu")
        conn.execute(
            "UPDATE approval_requests SET status = 'cancelled', current_level = NULL, updated_at = now() WHERE id = %s",
            (request_id,),
        )
        return _one(conn, user_id, request_id)


def pending_count(user_id: str) -> int:
    with db.pool().connection() as conn:
        return conn.execute(
            f"SELECT count(*) AS n FROM approval_requests r WHERE {TURN}", (user_id,)
        ).fetchone()["n"]
