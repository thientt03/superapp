import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from typing import Literal

from fastapi import Query

from app import auth, store, tasks
from app.schemas import (
    Attendance,
    Dashboard,
    Employee,
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
