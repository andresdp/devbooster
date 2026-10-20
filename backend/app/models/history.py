from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models._types import UTCDateTime, utcnow


class HistoryEntry(SQLModel, table=True):
    __tablename__ = "history_entry"

    id: int | None = Field(default=None, primary_key=True)
    ticket_id: int = Field(foreign_key="ticket.id", index=True)
    from_column_id: int | None = Field(default=None, foreign_key="board_column.id")
    to_column_id: int = Field(foreign_key="board_column.id")
    changed_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
