from datetime import datetime
from typing import Self

from pydantic import BaseModel

from app.models import Comment
from app.schemas._base import RequestModel, trimmed


class CommentCreate(RequestModel):
    author: trimmed(100, min_length=1)
    text: trimmed(5_000, min_length=1)


class CommentRead(BaseModel):
    id: int
    ticket_key: str
    author: str
    text: str
    created_at: datetime

    @classmethod
    def from_comment(cls, comment: Comment) -> Self:
        return cls(
            ticket_key=f"TKT-{comment.ticket_id}",
            **comment.model_dump(include={"id", "author", "text", "created_at"}),
        )
