from sqlalchemy import update
from sqlmodel import Session, func, select

from app.db import begin_write
from app.errors import InvalidMoveError, NotFoundError
from app.models import Column, Ticket
from app.models._types import utcnow
from app.schemas import TicketCreate, TicketMove, TicketUpdate
from app.services.boards import get_board
from app.services.history import record_change
from app.services.ids import in_id_range


def parse_key(key: str) -> int:
    """Turn a well-formed `TKT-<n>` key into a ticket id (the router validates the shape)."""
    ticket_id = int(key.removeprefix("TKT-"))
    if not in_id_range(ticket_id):
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


def _count_in_column(session: Session, column_id: int) -> int:
    return session.exec(
        select(func.count()).select_from(Ticket).where(Ticket.column_id == column_id)
    ).one()


def _shift_positions(session: Session, column_id: int, low: int, high: int, delta: int) -> None:
    """Add `delta` to the position of every ticket of `column_id` with low <= position <= high."""
    if low > high:
        return
    session.execute(
        update(Ticket)
        .where(Ticket.column_id == column_id, Ticket.position >= low, Ticket.position <= high)
        .values(position=Ticket.position + delta)
        .execution_options(synchronize_session=False)
    )


def move_ticket(session: Session, key: str, data: TicketMove) -> Ticket:
    """Move a ticket to another column of its board, or reorder it within its column.

    Runs as one write transaction: either every position shift and the history entry are
    stored, or nothing is. Both columns are left with positions exactly 0..n-1.
    """
    begin_write(session)
    ticket = get_ticket_or_404(session, key)
    target = session.get(Column, data.column_id) if in_id_range(data.column_id) else None
    if target is None or target.board_id != ticket.board_id:
        raise InvalidMoveError(f"Column {data.column_id} does not exist on the ticket's board")

    source_id, old_position = ticket.column_id, ticket.position
    if target.id == source_id:
        last = _count_in_column(session, source_id) - 1
        position = last if data.position is None else data.position
        if position > last:
            raise InvalidMoveError(f"Position must be between 0 and {last} for this column")
        if position == old_position:
            return ticket  # no-op: nothing written, updated_at untouched, no history
        if position < old_position:
            _shift_positions(session, source_id, position, old_position - 1, +1)
        else:
            _shift_positions(session, source_id, old_position + 1, position, -1)
        ticket.position = position
        session.add(ticket)
        session.commit()
        session.refresh(ticket)
        return ticket

    count = _count_in_column(session, target.id)
    position = count if data.position is None else data.position
    if position > count:
        raise InvalidMoveError(f"Position must be between 0 and {count} for column {target.id}")
    _shift_positions(session, source_id, old_position + 1, 2**63 - 1, -1)
    _shift_positions(session, target.id, position, 2**63 - 1, +1)
    ticket.column_id = target.id
    ticket.position = position
    ticket.updated_at = utcnow()
    session.add(ticket)
    session.flush()
    record_change(session, ticket.id, source_id, target.id)
    session.commit()
    session.refresh(ticket)
    return ticket
