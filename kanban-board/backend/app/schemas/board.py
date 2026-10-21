from datetime import datetime
from typing import Self

from pydantic import BaseModel

from app.models import Board, Column, Ticket
from app.schemas._base import RequestModel, trimmed
from app.schemas.ticket import TicketRead


class BoardCreate(RequestModel):
    name: trimmed(100, min_length=1)


class BoardSummary(BaseModel):
    id: int
    name: str
    created_at: datetime


class ColumnRead(BaseModel):
    id: int
    name: str
    position: int


class BoardCreated(BoardSummary):
    columns: list[ColumnRead]

    @classmethod
    def from_models(cls, board: Board, columns: list[Column]) -> Self:
        return cls(
            **board.model_dump(include={"id", "name", "created_at"}),
            columns=[
                ColumnRead(**c.model_dump(include={"id", "name", "position"})) for c in columns
            ],
        )


class ColumnWithTickets(ColumnRead):
    tickets: list[TicketRead]


class BoardDetail(BoardSummary):
    columns: list[ColumnWithTickets]

    @classmethod
    def from_models(cls, board: Board, columns: list[tuple[Column, list[Ticket]]]) -> Self:
        return cls(
            **board.model_dump(include={"id", "name", "created_at"}),
            columns=[
                ColumnWithTickets(
                    **column.model_dump(include={"id", "name", "position"}),
                    tickets=[TicketRead.from_ticket(t) for t in tickets],
                )
                for column, tickets in columns
            ],
        )
