from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


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


class Employee(BaseModel):
    id: str
    full_name: str
    avatar_url: str | None


Status = Literal["todo", "in_progress", "done"]
Priority = Literal["low", "medium", "high"]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200, pattern=r"^[^\x00]*$")]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000, pattern=r"^[^\x00]*$")]
AssigneeId = Annotated[str, StringConstraints(max_length=64, pattern=r"^[^\x00]*$")]


class Task(BaseModel):
    id: int
    title: str
    description: str | None
    status: Status
    priority: Priority
    due_date: str | None
    is_overdue: bool
    can_edit: bool
    assigner: Employee
    assignee: Employee
    created_at: str
    updated_at: str


class TaskPage(BaseModel):
    items: list[Task]
    next_cursor: str | None


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title
    description: Description | None = None
    assignee_id: AssigneeId
    due_date: date | None = None
    priority: Priority = "medium"


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Title | None = None
    description: Description | None = None
    assignee_id: AssigneeId | None = None
    due_date: date | None = None
    priority: Priority | None = None
    status: Status | None = None

    @model_validator(mode="after")
    def _no_null(self):
        for f in ("title", "assignee_id", "priority", "status"):
            if f in self.model_fields_set and getattr(self, f) is None:
                raise ValueError(f"{f} không được null")
        return self


class Dashboard(BaseModel):
    user: User
    attendance: Attendance
    events_today: list[Event]
    pinned_apps: list[PinnedApp]
    notifications: Notifications
    my_task: Task | None = None


class LoginRequest(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
