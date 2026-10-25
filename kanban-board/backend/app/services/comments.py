from sqlmodel import Session, select

from app.db import begin_write
from app.models import Comment
from app.schemas import CommentCreate
from app.services.tickets import get_ticket_or_404


def add_comment(session: Session, key: str, data: CommentCreate) -> Comment:
    begin_write(session)
    ticket = get_ticket_or_404(session, key)
    comment = Comment(ticket_id=ticket.id, **data.model_dump())
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def list_comments(session: Session, key: str) -> list[Comment]:
    ticket = get_ticket_or_404(session, key)
    return list(
        session.exec(
            select(Comment)
            .where(Comment.ticket_id == ticket.id)
            .order_by(Comment.created_at, Comment.id)
        )
    )
