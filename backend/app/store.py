from datetime import datetime
from zoneinfo import ZoneInfo

from app.schemas import Attendance, Dashboard, Event, Notifications, PinnedApp, User

TZ = ZoneInfo("Asia/Ho_Chi_Minh")

SHIFT_START = "08:30"
USER = User(
    id="u1",
    full_name="Nguyễn Văn A",
    avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
)
EVENTS = [
    Event(id="e1", title="Review sprint", start_time="09:00", end_time="10:00", location="Phòng B2"),
    Event(id="e2", title="Họp giao ban tuần", start_time="15:30", end_time="16:30", location="Phòng A1"),
]
APPS = [
    PinnedApp(id=i, name=n)
    for i, n in [
        ("cong-viec", "Công việc"),
        ("de-xuat", "Đề xuất"),
        ("phe-duyet", "Phê duyệt"),
        ("tuyen-dung", "Tuyển dụng"),
        ("hanh-chinh", "Hành chính"),
        ("cham-cong", "Chấm công"),
        ("ho-so", "Hồ sơ"),
        ("tinh-luong", "Tính lương & phúc lợi"),
        ("bao-cao", "Báo cáo"),
        ("kho", "Kho"),
        ("cai-dat", "Cài đặt"),
    ]
]

# shortcut: state trong bộ nhớ, mất khi restart và không dùng được khi chạy nhiều worker; chuyển sang DB khi có yêu cầu
_checked_in: datetime | None = None


class AlreadyCheckedIn(Exception):
    pass


def now() -> datetime:
    return datetime.now(TZ)


def _checked_today(current: datetime) -> str | None:
    if _checked_in is not None and _checked_in.date() == current.date():
        return _checked_in.strftime("%H:%M")
    return None


def get_dashboard() -> Dashboard:
    current = now()
    hhmm = current.strftime("%H:%M")
    events = sorted(
        (e for e in EVENTS if (e.end_time or e.start_time) >= hhmm),
        key=lambda e: e.start_time,
    )
    return Dashboard(
        user=USER,
        attendance=Attendance(shift_start=SHIFT_START, checked_in_at=_checked_today(current)),
        events_today=events,
        pinned_apps=APPS,
        notifications=Notifications(unread_count=3),
    )


def check_in() -> Attendance:
    global _checked_in
    current = now()
    if _checked_today(current) is not None:
        raise AlreadyCheckedIn
    _checked_in = current
    return Attendance(shift_start=SHIFT_START, checked_in_at=current.strftime("%H:%M"))
