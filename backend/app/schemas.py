from pydantic import BaseModel, Field


class User(BaseModel):
    id: str
    full_name: str
    avatar_url: str | None


class Attendance(BaseModel):
    shift_start: str
    checked_in_at: str | None


class Event(BaseModel):
    id: str
    title: str
    start_time: str
    end_time: str | None
    location: str | None


class PinnedApp(BaseModel):
    id: str
    name: str


class Notifications(BaseModel):
    unread_count: int


class Dashboard(BaseModel):
    user: User
    attendance: Attendance
    events_today: list[Event]
    pinned_apps: list[PinnedApp]
    notifications: Notifications


class LoginRequest(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
