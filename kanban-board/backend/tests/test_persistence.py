from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.config import Settings
from app.db import create_db_and_tables
from app.main import create_app
from app.models import Comment, HistoryEntry
from tests.conftest import make_board, make_ticket

API = "/api/v1"


def snapshot(client, board_id):
    return client.get(f"{API}/boards/{board_id}").json()


def test_data_survives_a_restart(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'persist.db'}",
        cors_origins=["http://localhost:5173"],
        seed_on_startup=False,
    )
    first_app = create_app(settings)
    with TestClient(first_app) as client:
        board = make_board(client, "Durable")
        make_ticket(client, board["id"], title="One", type="bug", priority="high")
        make_ticket(client, board["id"], title="Two", assignee="Ana")
        with Session(first_app.state.engine) as session:
            session.add(Comment(ticket_id=1, author="Ana", text="Hello"))
            session.commit()
        before = snapshot(client, board["id"])
        with Session(first_app.state.engine) as session:
            history_before = [
                (h.ticket_id, h.from_column_id, h.to_column_id)
                for h in session.exec(select(HistoryEntry).order_by(HistoryEntry.id))
            ]

    second_app = create_app(settings)
    with TestClient(second_app) as client:
        assert snapshot(client, board["id"]) == before
        assert client.get(f"{API}/tickets/TKT-1").json()["title"] == "One"
        with Session(second_app.state.engine) as session:
            history_after = [
                (h.ticket_id, h.from_column_id, h.to_column_id)
                for h in session.exec(select(HistoryEntry).order_by(HistoryEntry.id))
            ]
            comments = session.exec(select(Comment)).all()
        assert history_after == history_before and len(history_after) == 2
        assert [c.text for c in comments] == ["Hello"]
        # keys keep counting after a restart
        assert make_ticket(client, board["id"])["key"] == "TKT-3"


def test_create_db_and_tables_is_idempotent(app):
    create_db_and_tables(app.state.engine)
    create_db_and_tables(app.state.engine)
    with TestClient(app) as client:
        assert client.get(f"{API}/boards").status_code == 200
