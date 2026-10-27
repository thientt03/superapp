import hashlib
import hmac
import math
import secrets
import threading
from datetime import datetime, timedelta

from app import store

USERS: dict[str, tuple[bytes, bytes, str]] = {
    "demo": (
        bytes.fromhex("840e5579ffbe965df602288a05a2384f"),
        bytes.fromhex("495c2ff7a7fb543fed2696fdddd223c310b6d47e7950338dcf98934ca6934d5e"),
        "u1",
    )
}
_DUMMY_SALT = bytes(16)
_ITER = 600_000
TOKEN_TTL = timedelta(hours=12)
# shortcut: token trong bộ nhớ, mất khi restart và không chia sẻ giữa nhiều worker; chuyển sang DB/JWT khi có user thật
_tokens: dict[str, tuple[str, datetime]] = {}

MAX_FAILS = 5
FAIL_WINDOW = timedelta(minutes=15)
# shortcut: bộ đếm trong bộ nhớ, mất khi restart và không chia sẻ giữa nhiều worker; chuyển sang Redis khi chạy nhiều instance
_fails: dict[str, list[datetime]] = {}
_lock = threading.Lock()


def _keys(username: str, ip: str) -> list[str]:
    return ["u:" + username, "ip:" + ip]


def reserve_attempt(username: str, ip: str) -> int | None:
    """Kiểm tra giới hạn và giữ chỗ một lần thử (tính như lần sai) trong cùng một lock, TRƯỚC khi chạy PBKDF2."""
    with _lock:
        now = store.now()
        for k in list(_fails):  # dọn khoá hết hạn để username không bao giờ thử lại không nằm mãi trong bộ nhớ
            stamps = [t for t in _fails[k] if t > now - FAIL_WINDOW]
            if stamps:
                _fails[k] = stamps
            else:
                del _fails[k]
        keys = _keys(username, ip)
        waits = [
            max(1, math.ceil((min(_fails[k]) + FAIL_WINDOW - now).total_seconds()))
            for k in keys
            if len(_fails.get(k, [])) >= MAX_FAILS
        ]
        if waits:
            return max(waits)
        for k in keys:
            _fails.setdefault(k, []).append(now)
        return None


def clear_failures(username: str, ip: str) -> None:
    with _lock:
        for k in _keys(username, ip):
            _fails.pop(k, None)


def login(username: str, password: str) -> str | None:
    salt, expected, user_id = USERS.get(username, (_DUMMY_SALT, bytes(32), ""))
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITER)
    if not hmac.compare_digest(actual, expected) or username not in USERS:
        return None
    token = secrets.token_urlsafe(32)
    _tokens[token] = (user_id, store.now() + TOKEN_TTL)
    return token


def user_for_token(token: str) -> str | None:
    entry = _tokens.get(token)
    if entry is None:
        return None
    if store.now() < entry[1]:
        return entry[0]
    _tokens.pop(token, None)
    return None


def logout(token: str) -> None:
    _tokens.pop(token, None)
