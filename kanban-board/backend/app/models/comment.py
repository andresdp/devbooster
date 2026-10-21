from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models._types import UTCDateTime, utcnow


class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="ticket.id", index=True)
    author: str = Field(max_length=100)
    text: str = Field(max_length=5_000)
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
