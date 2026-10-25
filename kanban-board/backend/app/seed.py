"""Idempotent sample data: one board with tickets, comments and move history.

Everything is created through the services so positions, keys and history entries follow
the same rules as user requests. Run directly with `python -m app.seed`.
"""

from dataclasses import dataclass, field

from sqlmodel import Session, select

from app.config import get_settings
from app.db import create_db_and_tables, make_engine
from app.errors import ConflictError
from app.models import Board, Priority, TicketType
from app.schemas import BoardCreate, CommentCreate, TicketCreate, TicketMove
from app.services.boards import create_board
from app.services.comments import add_comment
from app.services.tickets import create_ticket, move_ticket

SAMPLE_BOARD_NAME = "Sample Project"

TO_DO, IN_PROGRESS, REVIEW, DONE = "To Do", "In Progress", "Review", "Done"
FLOW = (TO_DO, IN_PROGRESS, REVIEW, DONE)


@dataclass(frozen=True)
class SampleTicket:
    title: str
    type: TicketType
    priority: Priority
    assignee: str | None
    column: str
    description: str = ""
    comments: tuple[tuple[str, str], ...] = field(default_factory=tuple)


SAMPLE_TICKETS: tuple[SampleTicket, ...] = (
    SampleTicket(
        "Set up CI pipeline",
        TicketType.task,
        Priority.high,
        "Ana",
        DONE,
        "Run tests and lint on every push.",
        (("Ana", "Pipeline is green on main."), ("Ben", "Nice, cache the dependencies next.")),
    ),
    SampleTicket(
        "Login fails with special characters in password",
        TicketType.bug,
        Priority.critical,
        "Ben",
        REVIEW,
        "Passwords containing '%' are rejected by the login form.",
        (("Ben", "Root cause: the form URL-encodes the password twice."),),
    ),
    SampleTicket(
        "Add dark mode",
        TicketType.feature,
        Priority.medium,
        "Carla",
        IN_PROGRESS,
        "Respect the OS preference and allow a manual toggle.",
        (("Carla", "Design tokens are ready; wiring the toggle now."),),
    ),
    SampleTicket(
        "Flaky test in payment module",
        TicketType.bug,
        Priority.high,
        "Ben",
        IN_PROGRESS,
        "test_refund_timeout fails roughly one run in ten.",
    ),
    SampleTicket(
        "Upgrade to Python 3.12",
        TicketType.task,
        Priority.medium,
        "Ana",
        DONE,
        comments=(("Ana", "Done, no behavior changes."),),
    ),
    SampleTicket("Export board as CSV", TicketType.feature, Priority.low, None, TO_DO),
    SampleTicket("Write onboarding guide", TicketType.task, Priority.medium, None, TO_DO),
    SampleTicket("Drag-and-drop reorder on mobile", TicketType.feature, Priority.high, None, TO_DO),
)


def seed_if_empty(session: Session) -> bool:
    """Create the sample board unless any board exists. Returns whether it seeded."""
    if session.exec(select(Board.id).limit(1)).first() is not None:
        return False
    try:
        _, columns = create_board(session, BoardCreate(name=SAMPLE_BOARD_NAME))
    except ConflictError:  # another process seeded concurrently
        session.rollback()
        return False
    column_ids = {column.name: column.id for column in columns}
    board_id = columns[0].board_id

    for sample in SAMPLE_TICKETS:
        ticket = create_ticket(
            session,
            board_id,
            TicketCreate(
                title=sample.title,
                description=sample.description,
                type=sample.type,
                priority=sample.priority,
                assignee=sample.assignee,
            ),
        )
        key = f"TKT-{ticket.id}"
        # Walk the ticket through every column up to its target so history is realistic.
        for column_name in FLOW[1 : FLOW.index(sample.column) + 1]:
            move_ticket(session, key, TicketMove(column_id=column_ids[column_name]))
        for author, text in sample.comments:
            add_comment(session, key, CommentCreate(author=author, text=text))
    return True


def main() -> None:
    settings = get_settings()
    engine = make_engine(settings.database_url)
    create_db_and_tables(engine)
    with Session(engine) as session:
        seeded = seed_if_empty(session)
    print(f"Seeded '{SAMPLE_BOARD_NAME}'" if seeded else "Boards already exist; nothing seeded")


if __name__ == "__main__":
    main()
