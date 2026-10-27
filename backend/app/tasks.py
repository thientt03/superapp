import base64
import binascii
import json
from datetime import date

from app import db, store
from app.schemas import Employee, Task, TaskCreate, TaskPage, TaskUpdate

SELECT = """
SELECT t.*, ar.full_name AS ar_name, ar.avatar_url AS ar_avatar,
       ae.full_name AS ae_name, ae.avatar_url AS ae_avatar
FROM tasks t
JOIN employees ar ON ar.id = t.assigner_id
JOIN employees ae ON ae.id = t.assignee_id
"""
ORDER = "ORDER BY t.due_date ASC NULLS LAST, t.id ASC"
RELATED = "(t.assigner_id = %s OR t.assignee_id = %s)"


class TaskNotFound(Exception):
    pass


class TaskForbidden(Exception):
    pass


class AssigneeNotFound(Exception):
    pass


class InvalidCursor(Exception):
    pass


def _task(r: dict, user_id: str) -> Task:
    due: date | None = r["due_date"]
    return Task(
        id=r["id"],
        title=r["title"],
        description=r["description"],
        status=r["status"],
        priority=r["priority"],
        due_date=due.isoformat() if due else None,
        is_overdue=due is not None and due < store.now().date() and r["status"] != "done",
        can_edit=r["assigner_id"] == user_id,
        assigner=Employee(id=r["assigner_id"], full_name=r["ar_name"], avatar_url=r["ar_avatar"]),
        assignee=Employee(id=r["assignee_id"], full_name=r["ae_name"], avatar_url=r["ae_avatar"]),
        created_at=r["created_at"].astimezone(store.TZ).isoformat(),
        updated_at=r["updated_at"].astimezone(store.TZ).isoformat(),
    )


def _row(conn, user_id: str, task_id: int, lock: bool = False) -> dict:
    # FOR UPDATE OF t: khoá dòng tasks, tránh PATCH/DELETE chồng nhau
    sql = f"{SELECT} WHERE t.id = %s AND {RELATED}" + (" FOR UPDATE OF t" if lock else "")
    r = conn.execute(sql, (task_id, user_id, user_id)).fetchone()
    if r is None:
        raise TaskNotFound
    return r


def _check_assignee(conn, assignee_id: str) -> None:
    if conn.execute("SELECT 1 FROM employees WHERE id = %s", (assignee_id,)).fetchone() is None:
        raise AssigneeNotFound


def list_employees() -> list[Employee]:
    with db.pool().connection() as conn:
        rows = conn.execute("SELECT id, full_name, avatar_url FROM employees ORDER BY id").fetchall()
    return [Employee(**r) for r in rows]


def _encode(r: dict) -> str:
    d = r["due_date"].isoformat() if r["due_date"] else None
    return base64.urlsafe_b64encode(json.dumps({"d": d, "i": r["id"]}).encode()).decode()


def _decode(cursor: str) -> tuple[date | None, int]:
    if len(cursor) > 200:  # cursor hợp lệ ~50 ký tự
        raise InvalidCursor
    try:
        o = json.loads(base64.urlsafe_b64decode(cursor.encode("ascii")))
        d, i = o["d"], o["i"]
        if set(o) != {"d", "i"} or type(i) is not int or not (d is None or isinstance(d, str)):
            raise ValueError
        return (date.fromisoformat(d) if d else None), i
    except (ValueError, KeyError, TypeError, binascii.Error, RecursionError):
        raise InvalidCursor


def list_tasks(user_id: str, scope: str, status: str | None, limit: int, cursor: str | None) -> TaskPage:
    col = "assigner_id" if scope == "assigned_by_me" else "assignee_id"
    where, params = [f"t.{col} = %s"], [user_id]
    if status:
        where.append("t.status = %s")
        params.append(status)
    if cursor:
        d, i = _decode(cursor)
        if d is None:
            where.append("(t.due_date IS NULL AND t.id > %s)")
            params.append(i)
        else:
            where.append("(t.due_date > %s OR (t.due_date = %s AND t.id > %s) OR t.due_date IS NULL)")
            params += [d, d, i]
    sql = f"{SELECT} WHERE {' AND '.join(where)} {ORDER} LIMIT %s"
    with db.pool().connection() as conn:
        rows = conn.execute(sql, (*params, limit + 1)).fetchall()
    page = rows[:limit]
    return TaskPage(
        items=[_task(r, user_id) for r in page],
        next_cursor=_encode(page[-1]) if len(rows) > limit else None,
    )


def get_task(user_id: str, task_id: int) -> Task:
    with db.pool().connection() as conn:
        return _task(_row(conn, user_id, task_id), user_id)


def create_task(user_id: str, body: TaskCreate) -> Task:
    with db.pool().connection() as conn:
        _check_assignee(conn, body.assignee_id)
        new_id = conn.execute(
            "INSERT INTO tasks (title, description, priority, due_date, assigner_id, assignee_id)"
            " VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (body.title, body.description or None, body.priority, body.due_date, user_id, body.assignee_id),
        ).fetchone()["id"]
        return _task(_row(conn, user_id, new_id), user_id)


def update_task(user_id: str, task_id: int, body: TaskUpdate) -> Task:
    with db.pool().connection() as conn:
        r = _row(conn, user_id, task_id, lock=True)
        sent = body.model_fields_set
        if r["assigner_id"] != user_id and sent != {"status"}:
            raise TaskForbidden("Bạn chỉ được đổi trạng thái công việc này")
        if "assignee_id" in sent:
            _check_assignee(conn, body.assignee_id)
        values = {f: getattr(body, f) for f in sent}
        if "description" in values:
            values["description"] = values["description"] or None
        cols = list(values)  # tên cột lấy từ field của schema (extra=forbid), không từ input thô
        conn.execute(
            f"UPDATE tasks SET {', '.join(c + ' = %s' for c in cols)}, updated_at = now() WHERE id = %s",
            (*values.values(), task_id),
        )
        return _task(_row(conn, user_id, task_id), user_id)


def delete_task(user_id: str, task_id: int) -> None:
    with db.pool().connection() as conn:
        r = _row(conn, user_id, task_id, lock=True)
        if r["assigner_id"] != user_id:
            raise TaskForbidden("Chỉ người giao mới được xoá công việc")
        conn.execute("DELETE FROM tasks WHERE id = %s", (task_id,))


def my_task(user_id: str) -> Task | None:
    with db.pool().connection() as conn:
        r = conn.execute(
            f"{SELECT} WHERE t.assignee_id = %s AND t.status != 'done' {ORDER} LIMIT 1", (user_id,)
        ).fetchone()
    return _task(r, user_id) if r else None
