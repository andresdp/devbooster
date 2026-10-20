from collections import defaultdict

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.db import begin_write
from app.errors import ConflictError, NotFoundError
from app.models import DEFAULT_COLUMN_NAMES, Board, Column, Ticket
from app.schemas import BoardCreate
from app.services.ids import in_id_range


def create_board(session: Session, data: BoardCreate) -> tuple[Board, list[Column]]:
    begin_write(session)
    name_key = data.name.casefold()
    if session.exec(select(Board.id).where(Board.name_key == name_key)).first() is not None:
        raise ConflictError(f"A board named '{data.name}' already exists")
    board = Board(name=data.name, name_key=name_key)
    session.add(board)
    try:
        session.flush()
    except IntegrityError as exc:
        raise ConflictError(f"A board named '{data.name}' already exists") from exc
    columns = [
        Column(board_id=board.id, name=name, position=position)
        for position, name in enumerate(DEFAULT_COLUMN_NAMES)
    ]
    session.add_all(columns)
    session.commit()
    session.refresh(board)
    for column in columns:
        session.refresh(column)
    return board, columns


def list_boards(session: Session) -> list[Board]:
    return list(session.exec(select(Board).order_by(Board.id)))


def get_board(session: Session, board_id: int) -> Board:
    board = session.get(Board, board_id) if in_id_range(board_id) else None
    if board is None:
        raise NotFoundError(f"Board {board_id} not found")
    return board


def get_board_detail(
    session: Session, board_id: int
) -> tuple[Board, list[tuple[Column, list[Ticket]]]]:
    board = get_board(session, board_id)
    columns = session.exec(
        select(Column).where(Column.board_id == board_id).order_by(Column.position)
    ).all()
    tickets = session.exec(
        select(Ticket)
        .where(Ticket.board_id == board_id)
        .order_by(Ticket.column_id, Ticket.position)
    ).all()
    by_column: dict[int, list[Ticket]] = defaultdict(list)
    for ticket in tickets:
        by_column[ticket.column_id].append(ticket)
    return board, [(column, by_column[column.id]) for column in columns]
