from sqlmodel import Session, select

from app.models import Column, HistoryEntry
from app.services import tickets as ticket_service


def record_change(session: Session, ticket_id: int, from_column_id: int | None, to_column_id: int):
    """Add a status-change entry to the caller's transaction (no commit)."""
    entry = HistoryEntry(
        ticket_id=ticket_id, from_column_id=from_column_id, to_column_id=to_column_id
    )
    session.add(entry)
    session.flush()
    return entry


def list_history(session: Session, key: str) -> tuple[list[HistoryEntry], dict[int, Column]]:
    """Return a ticket's history in chronological order plus the columns it references."""
    ticket = ticket_service.get_ticket_or_404(session, key)
    entries = list(
        session.exec(
            select(HistoryEntry)
            .where(HistoryEntry.ticket_id == ticket.id)
            .order_by(HistoryEntry.changed_at, HistoryEntry.id)
        )
    )
    columns = {
        column.id: column
        for column in session.exec(select(Column).where(Column.board_id == ticket.board_id))
    }
    return entries, columns
