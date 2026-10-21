from datetime import datetime
from typing import Annotated, Self

from fastapi import Path
from pydantic import BaseModel, Field, field_validator, model_validator

from app.models import Priority, Ticket, TicketType
from app.schemas._base import RequestModel, trimmed

TicketKey = Annotated[str, Path(pattern=r"^TKT-[1-9][0-9]*$", description="e.g. TKT-12")]

Title = trimmed(200, min_length=1)
Description = trimmed(10_000)
Assignee = trimmed(100)


def _blank_to_none(value: str | None) -> str | None:
    return value or None


class TicketCreate(RequestModel):
    title: Title
    description: Description = ""
    # Enums are validated leniently so JSON strings are accepted under strict mode.
    type: TicketType = Field(default=TicketType.task, strict=False)
    priority: Priority = Field(default=Priority.medium, strict=False)
    assignee: Assignee | None = None

    _blank_assignee = field_validator("assignee")(_blank_to_none)


class TicketUpdate(RequestModel):
    title: Title | None = None
    description: Description | None = None
    type: TicketType | None = Field(default=None, strict=False)
    priority: Priority | None = Field(default=None, strict=False)
    assignee: Assignee | None = None

    _blank_assignee = field_validator("assignee")(_blank_to_none)

    @model_validator(mode="after")
    def _check_supplied_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided")
        for name in ("title", "description", "type", "priority"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be null")
        return self


class TicketRead(BaseModel):
    key: str
    title: str
    description: str
    type: TicketType
    priority: Priority
    assignee: str | None
    board_id: int
    column_id: int
    position: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_ticket(cls, ticket: Ticket) -> Self:
        return cls(key=f"TKT-{ticket.id}", **ticket.model_dump(exclude={"id"}))
