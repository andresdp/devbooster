from fastapi import APIRouter

from app.db import SessionDep
from app.errors import ERROR_RESPONSES
from app.schemas import CommentCreate, CommentRead, HistoryEntryRead, TicketKey
from app.services import comments as comment_service
from app.services import history as history_service

router = APIRouter(tags=["comments"], responses=ERROR_RESPONSES)


@router.post("/tickets/{key}/comments", status_code=201, response_model=CommentRead)
def add_comment(key: TicketKey, data: CommentCreate, session: SessionDep):
    return CommentRead.from_comment(comment_service.add_comment(session, key, data))


@router.get("/tickets/{key}/comments", response_model=list[CommentRead])
def list_comments(key: TicketKey, session: SessionDep):
    return [CommentRead.from_comment(c) for c in comment_service.list_comments(session, key)]


@router.get("/tickets/{key}/history", response_model=list[HistoryEntryRead])
def list_history(key: TicketKey, session: SessionDep):
    entries, columns = history_service.list_history(session, key)
    return [HistoryEntryRead.from_entry(entry, columns) for entry in entries]
