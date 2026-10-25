from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.config import Settings
from app.main import create_app
from app.models import Board, Column, Comment, HistoryEntry, Ticket
from app.seed import SAMPLE_BOARD_NAME, seed_if_empty

API = "/api/v1"


def count(session, model) -> int:
    return session.exec(select(func.count()).select_from(model)).one()


def snapshot(session) -> dict[str, int]:
    return {
        model.__name__: count(session, model)
        for model in (Board, Column, Ticket, Comment, HistoryEntry)
    }


def test_seed_if_empty_builds_the_sample_board(app):
    with TestClient(app), Session(app.state.engine) as session:
        assert count(session, Board) == 0
        assert seed_if_empty(session) is True

        boards = session.exec(select(Board)).all()
        assert [b.name for b in boards] == [SAMPLE_BOARD_NAME]
        board = boards[0]
        columns = session.exec(
            select(Column).where(Column.board_id == board.id).order_by(Column.position)
        ).all()
        assert [c.name for c in columns] == ["To Do", "In Progress", "Review", "Done"]

        tickets = session.exec(select(Ticket).where(Ticket.board_id == board.id)).all()
        assert 6 <= len(tickets) <= 12
        assert count(session, Ticket) == len(tickets)
        occupied = {t.column_id for t in tickets}
        assert len(occupied) >= 3, "tickets should be spread across several columns"
        for column in columns:
            positions = sorted(t.position for t in tickets if t.column_id == column.id)
            assert positions == list(range(len(positions))), column.name
        assert len({t.type for t in tickets}) >= 2
        assert len({t.priority for t in tickets}) >= 2
        assert any(t.assignee for t in tickets) and any(t.assignee is None for t in tickets)

        assert count(session, Comment) >= 3
        comment_ticket_ids = {c.ticket_id for c in session.exec(select(Comment))}
        assert len(comment_ticket_ids) >= 2, "comments should span several tickets"

        entries = session.exec(select(HistoryEntry)).all()
        ticket_ids = {t.id for t in tickets}
        assert {e.ticket_id for e in entries} == ticket_ids
        creation = [e for e in entries if e.from_column_id is None]
        assert len(creation) == len(tickets)
        moves = [e for e in entries if e.from_column_id is not None]
        assert len(moves) >= 4, "moved tickets should carry realistic move history"
        for ticket in tickets:
            own = sorted(
                (e for e in entries if e.ticket_id == ticket.id), key=lambda e: (e.changed_at, e.id)
            )
            assert own[0].from_column_id is None
            assert own[-1].to_column_id == ticket.column_id
            for previous, current in zip(own, own[1:], strict=False):
                assert current.from_column_id == previous.to_column_id


def test_seed_if_empty_is_idempotent(app):
    with TestClient(app), Session(app.state.engine) as session:
        assert seed_if_empty(session) is True
        before = snapshot(session)
        assert seed_if_empty(session) is False
        assert snapshot(session) == before


def test_seed_if_empty_skips_when_any_board_exists(client, app):
    assert client.post(f"{API}/boards", json={"name": "Existing"}).status_code == 201
    with Session(app.state.engine) as session:
        assert seed_if_empty(session) is False
        assert [b.name for b in session.exec(select(Board))] == ["Existing"]


def test_startup_seeds_an_empty_database(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'seeded.db'}", cors_origins=[], seed_on_startup=True
    )
    with TestClient(create_app(settings)) as client:
        boards = client.get(f"{API}/boards").json()
        assert [b["name"] for b in boards] == [SAMPLE_BOARD_NAME]
        detail = client.get(f"{API}/boards/{boards[0]['id']}").json()
        assert [c["name"] for c in detail["columns"]] == ["To Do", "In Progress", "Review", "Done"]
        assert sum(len(c["tickets"]) for c in detail["columns"]) >= 6
        first_key = detail["columns"][0]["tickets"][0]["key"]
        assert client.get(f"{API}/tickets/{first_key}/history").json()


def test_restart_does_not_duplicate_the_seed(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'seeded.db'}", cors_origins=[], seed_on_startup=True
    )
    with TestClient(create_app(settings)) as client:
        first = client.get(f"{API}/boards").json()
        assert client.post(f"{API}/boards", json={"name": "Mine"}).status_code == 201
    with TestClient(create_app(settings)) as client:
        boards = client.get(f"{API}/boards").json()
        assert [b["name"] for b in boards] == [SAMPLE_BOARD_NAME, "Mine"]
        assert boards[0] == first[0]


def test_startup_does_not_seed_when_a_board_exists(tmp_path):
    url = f"sqlite:///{tmp_path / 'mine.db'}"
    unseeded = Settings(database_url=url, cors_origins=[], seed_on_startup=False)
    with TestClient(create_app(unseeded)) as client:
        assert client.post(f"{API}/boards", json={"name": "Mine"}).status_code == 201
    seeded = Settings(database_url=url, cors_origins=[], seed_on_startup=True)
    with TestClient(create_app(seeded)) as client:
        assert [b["name"] for b in client.get(f"{API}/boards").json()] == ["Mine"]


def test_default_client_fixture_is_unseeded(client):
    assert client.get(f"{API}/boards").json() == []
