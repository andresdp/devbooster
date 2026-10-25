from datetime import datetime
from typing import Self

from pydantic import BaseModel

from app.models import Column, HistoryEntry


class ColumnRef(BaseModel):
    id: int
    name: str

    @classmethod
    def from_column(cls, column: Column) -> Self:
        return cls(id=column.id, name=column.name)


class HistoryEntryRead(BaseModel):
    id: int
    ticket_key: str
    from_column: ColumnRef | None
    to_column: ColumnRef
    changed_at: datetime

    @classmethod
    def from_entry(cls, entry: HistoryEntry, columns: dict[int, Column]) -> Self:
        from_column = columns.get(entry.from_column_id) if entry.from_column_id else None
        return cls(
            id=entry.id,
            ticket_key=f"TKT-{entry.ticket_id}",
            from_column=ColumnRef.from_column(from_column) if from_column else None,
            to_column=ColumnRef.from_column(columns[entry.to_column_id]),
            changed_at=entry.changed_at,
        )
