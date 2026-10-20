from sqlmodel import Session, func, select

from app.db import begin_write
from app.errors import NotFoundError
from app.models import Column, Ticket
from app.models._types import utcnow
from app.schemas import TicketCreate, TicketUpdate
from app.services.boards import get_board
from app.services.history import record_change

SQLITE_MAX_ID = 2**63 - 1


def parse_key(key: str) -> int:
    """Turn a well-formed `TKT-<n>` key into a ticket id (the router validates the shape)."""
    ticket_id = int(key.removeprefix("TKT-"))
    if ticket_id > SQLITE_MAX_ID:
        raise NotFoundError(f"Ticket {key} not found")
    return ticket_id


def get_ticket_or_404(session: Session, key: str) -> Ticket:
    ticket = session.get(Ticket, parse_key(key))
    if ticket is None:
        raise NotFoundError(f"Ticket {key} not found")
    return ticket


def create_ticket(session: Session, board_id: int, data: TicketCreate) -> Ticket:
    begin_write(session)
    get_board(session, board_id)
    first_column = session.exec(
        select(Column).where(Column.board_id == board_id, Column.position == 0)
    ).one()
    position = session.exec(
        select(func.count()).select_from(Ticket).where(Ticket.column_id == first_column.id)
    ).one()
    ticket = Ticket(
        **data.model_dump(), board_id=board_id, column_id=first_column.id, position=position
    )
    session.add(ticket)
    session.flush()
    record_change(session, ticket.id, None, first_column.id)
    session.commit()
    session.refresh(ticket)
    return ticket


def update_ticket(session: Session, key: str, data: TicketUpdate) -> Ticket:
    begin_write(session)
    ticket = get_ticket_or_404(session, key)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)
    ticket.updated_at = utcnow()
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
