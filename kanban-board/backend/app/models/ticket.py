from datetime import datetime
from enum import StrEnum

from sqlalchemy import Index
from sqlmodel import Field, SQLModel

from app.models._types import UTCDateTime, utcnow


class TicketType(StrEnum):
    bug = "bug"
    feature = "feature"
    task = "task"


class Priority(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Ticket(SQLModel, table=True):
    __table_args__ = (
        Index("ix_ticket_column_position", "column_id", "position"),
        {"sqlite_autoincrement": True},
    )

    id: int | None = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id", index=True)
    column_id: int = Field(foreign_key="board_column.id")
    position: int
    title: str = Field(max_length=200)
    description: str = Field(default="", max_length=10_000)
    type: TicketType = Field(default=TicketType.task)
    priority: Priority = Field(default=Priority.medium)
    assignee: str | None = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
