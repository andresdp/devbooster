from sqlmodel import Session

from app.models import HistoryEntry


def record_change(session: Session, ticket_id: int, from_column_id: int | None, to_column_id: int):
    """Add a status-change entry to the caller's transaction (no commit)."""
    entry = HistoryEntry(
        ticket_id=ticket_id, from_column_id=from_column_id, to_column_id=to_column_id
    )
    session.add(entry)
    session.flush()
    return entry
