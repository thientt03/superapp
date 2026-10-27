import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app import auth, store
from app.schemas import Attendance, Dashboard, LoginRequest, Token

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


def current_token(
    cred: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> str:
    if cred is None or auth.user_for_token(cred.credentials) is None:
        raise HTTPException(
            401,
            "Chưa đăng nhập hoặc phiên đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return cred.credentials


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


@app.get("/api/dashboard", response_model=Dashboard, dependencies=[Depends(current_token)])
def dashboard():
    return store.get_dashboard()


@app.post("/api/attendance/check-in", response_model=Attendance, dependencies=[Depends(current_token)])
def check_in():
    try:
        return store.check_in()
    except store.AlreadyCheckedIn:
        raise HTTPException(409, "Bạn đã chấm vào hôm nay")
