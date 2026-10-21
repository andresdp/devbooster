from fastapi import APIRouter

from app.db import SessionDep
from app.errors import ERROR_RESPONSES
from app.schemas import (
    BoardCreate,
    BoardCreated,
    BoardDetail,
    BoardSummary,
    TicketCreate,
    TicketRead,
)
from app.services import boards as board_service
from app.services import tickets as ticket_service

router = APIRouter(tags=["boards"], responses=ERROR_RESPONSES)


@router.post("/boards", status_code=201, response_model=BoardCreated)
def create_board(data: BoardCreate, session: SessionDep):
    board, columns = board_service.create_board(session, data)
    return BoardCreated.from_models(board, columns)


@router.get("/boards", response_model=list[BoardSummary])
def list_boards(session: SessionDep):
    return board_service.list_boards(session)


@router.get("/boards/{board_id}", response_model=BoardDetail)
def get_board(board_id: int, session: SessionDep):
    board, columns = board_service.get_board_detail(session, board_id)
    return BoardDetail.from_models(board, columns)


@router.post("/boards/{board_id}/tickets", status_code=201, response_model=TicketRead)
def create_ticket(board_id: int, data: TicketCreate, session: SessionDep):
    return TicketRead.from_ticket(ticket_service.create_ticket(session, board_id, data))
