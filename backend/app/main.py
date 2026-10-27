import json
import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from typing import Literal

from fastapi import Query

from app import approvals, auth, store, tasks
from app.schemas import (
    ApprovalApprove,
    ApprovalCreate,
    ApprovalPage,
    ApprovalRequest,
    ApprovalReject,
    ApprovalStatus,
    ApprovalType,
    ApprovalTypeList,
    Attendance,
    Dashboard,
    Employee,
    FlowUpdate,
    LoginRequest,
    Status,
    Task,
    TaskCreate,
    TaskPage,
    TaskUpdate,
    Token,
)

app = FastAPI(title="SuperApp API")

origins = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def _validation_error(request: Request, exc: RequestValidationError):
    # ensure_ascii: input có surrogate lẻ ("\ud800") làm handler mặc định ném UnicodeEncodeError
    try:
        body = json.dumps({"detail": jsonable_encoder(exc.errors())}, ensure_ascii=True)
    except RecursionError:  # BM-03: body JSON lồng sâu, `input` trong lỗi làm encoder đệ quy quá giới hạn
        body = json.dumps({"detail": [{"type": "json_invalid", "loc": ["body"], "msg": "JSON decode error"}]})
    return Response(body, status_code=422, media_type="application/json")


def _unauthorized() -> HTTPException:
    return HTTPException(
        401,
        "Chưa đăng nhập hoặc phiên đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_token(
    cred: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> str:
    if cred is None or auth.user_for_token(cred.credentials) is None:
        raise _unauthorized()
    return cred.credentials


def current_user(token: str = Depends(current_token)) -> str:
    user = auth.user_for_token(token)
    if user is None:  # token hết hạn/logout giữa hai lần tra
        raise _unauthorized()
    return user


NOT_FOUND = "Không tìm thấy công việc"
APPROVAL_NOT_FOUND = "Không tìm thấy yêu cầu phê duyệt"


@app.post("/api/auth/login", response_model=Token)
def login(body: LoginRequest, request: Request):
    ip = request.client.host if request.client else ""
    wait = auth.reserve_attempt(body.username, ip)
    if wait is not None:
        raise HTTPException(
            429,
            "Thử đăng nhập quá nhiều lần, vui lòng thử lại sau",
            headers={"Retry-After": str(wait)},
        )
    token = auth.login(body.username, body.password)
    if token is None:
        raise HTTPException(401, "Sai tên đăng nhập hoặc mật khẩu")
    auth.clear_failures(body.username, ip)
    return Token(access_token=token)


@app.post("/api/auth/logout", status_code=204)
def logout(token: str = Depends(current_token)):
    auth.logout(token)
    return Response(status_code=204)


@app.get("/api/dashboard", response_model=Dashboard)
def dashboard(user_id: str = Depends(current_user)):
    d = store.get_dashboard()
    d.my_task = tasks.my_task(user_id)
    d.pending_approval_count = approvals.pending_count(user_id)
    return d


@app.post("/api/attendance/check-in", response_model=Attendance, dependencies=[Depends(current_token)])
def check_in():
    try:
        return store.check_in()
    except store.AlreadyCheckedIn:
        raise HTTPException(409, "Bạn đã chấm vào hôm nay")


@app.get("/api/employees", response_model=list[Employee], dependencies=[Depends(current_token)])
def employees():
    return tasks.list_employees()


@app.get("/api/tasks", response_model=TaskPage)
def list_tasks(
    scope: Literal["assigned_to_me", "assigned_by_me"] = "assigned_to_me",
    status: Status | None = None,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user_id: str = Depends(current_user),
):
    try:
        return tasks.list_tasks(user_id, scope, status, limit, cursor)
    except tasks.InvalidCursor:
        raise HTTPException(422, "Cursor không hợp lệ")


@app.get("/api/tasks/{task_id}", response_model=Task)
def get_task(task_id: int, user_id: str = Depends(current_user)):
    try:
        return tasks.get_task(user_id, task_id)
    except tasks.TaskNotFound:
        raise HTTPException(404, NOT_FOUND)


@app.post("/api/tasks", response_model=Task, status_code=201)
def create_task(body: TaskCreate, user_id: str = Depends(current_user)):
    try:
        return tasks.create_task(user_id, body)
    except tasks.AssigneeNotFound:
        raise HTTPException(422, "Người được giao không tồn tại")


@app.patch("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, body: TaskUpdate, user_id: str = Depends(current_user)):
    if not body.model_fields_set:
        raise HTTPException(422, "Không có trường nào để cập nhật")
    try:
        return tasks.update_task(user_id, task_id, body)
    except tasks.TaskNotFound:
        raise HTTPException(404, NOT_FOUND)
    except tasks.TaskForbidden as e:
        raise HTTPException(403, str(e))
    except tasks.AssigneeNotFound:
        raise HTTPException(422, "Người được giao không tồn tại")


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, user_id: str = Depends(current_user)):
    try:
        tasks.delete_task(user_id, task_id)
    except tasks.TaskNotFound:
        raise HTTPException(404, NOT_FOUND)
    except tasks.TaskForbidden as e:
        raise HTTPException(403, str(e))
    return Response(status_code=204)


@app.get("/api/approval-types", response_model=ApprovalTypeList)
def approval_types(user_id: str = Depends(current_user)):
    return approvals.list_types(user_id)


@app.put("/api/approval-types/{code}/steps", response_model=ApprovalType)
def update_approval_flow(code: str, body: FlowUpdate, user_id: str = Depends(current_user)):
    try:
        return approvals.update_flow(user_id, code, body.approver_ids)
    except approvals.ApprovalForbidden as e:
        raise HTTPException(403, str(e))
    except approvals.DocTypeNotFound:
        raise HTTPException(404, "Không tìm thấy loại chứng từ")
    except approvals.ApprovalInvalid as e:
        raise HTTPException(422, str(e))


@app.get("/api/approvals", response_model=ApprovalPage)
def list_approvals(
    scope: Literal["to_approve", "submitted"] = "to_approve",
    status: ApprovalStatus | None = None,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user_id: str = Depends(current_user),
):
    try:
        return approvals.list_requests(user_id, scope, status, limit, cursor)
    except approvals.InvalidCursor:
        raise HTTPException(422, "Cursor không hợp lệ")
    except approvals.ApprovalInvalid as e:
        raise HTTPException(422, str(e))


@app.get("/api/approvals/{request_id}", response_model=ApprovalRequest)
def get_approval(request_id: int, user_id: str = Depends(current_user)):
    try:
        return approvals.get_request(user_id, request_id)
    except approvals.ApprovalNotFound:
        raise HTTPException(404, APPROVAL_NOT_FOUND)


@app.post("/api/approvals", response_model=ApprovalRequest, status_code=201)
def create_approval(body: ApprovalCreate, user_id: str = Depends(current_user)):
    try:
        return approvals.create_request(user_id, body)
    except approvals.ApprovalInvalid as e:
        raise HTTPException(422, str(e))


def _act(fn, *args):
    try:
        return fn(*args)
    except approvals.ApprovalNotFound:
        raise HTTPException(404, APPROVAL_NOT_FOUND)
    except approvals.ApprovalConflict as e:
        raise HTTPException(409, str(e))
    except approvals.ApprovalForbidden as e:
        raise HTTPException(403, str(e))


@app.post("/api/approvals/{request_id}/approve", response_model=ApprovalRequest)
def approve_approval(request_id: int, body: ApprovalApprove, user_id: str = Depends(current_user)):
    return _act(approvals.approve, user_id, request_id, body.comment)


@app.post("/api/approvals/{request_id}/reject", response_model=ApprovalRequest)
def reject_approval(request_id: int, body: ApprovalReject, user_id: str = Depends(current_user)):
    return _act(approvals.reject, user_id, request_id, body.comment)


@app.post("/api/approvals/{request_id}/cancel", response_model=ApprovalRequest)
def cancel_approval(request_id: int, user_id: str = Depends(current_user)):
    return _act(approvals.cancel, user_id, request_id)
