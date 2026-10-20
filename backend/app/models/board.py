from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models._types import UTCDateTime, utcnow


class Board(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    name_key: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
