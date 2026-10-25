"""EC-012 and FR-015: concurrent moves stay gap-free; a failed move leaves nothing behind."""

import random
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.models import HistoryEntry
from app.services import tickets as ticket_service
from tests.conftest import board_columns, make_board, make_ticket, move_ticket

API = "/api/v1"


def history_count(app):
    with Session(app.state.engine) as session:
        return session.exec(select(func.count()).select_from(HistoryEntry)).one()


def test_concurrent_moves_and_reorders_keep_columns_gap_free(app, client):
    board = make_board(client)
    cols = {c["name"]: c["id"] for c in board["columns"]}
    keys = [make_ticket(client, board["id"], title=f"T{i}")["key"] for i in range(12)]

    rng = random.Random(42)
    operations = []
    for _ in range(40):
        key = rng.choice(keys)
        if rng.random() < 0.5:
            body = {"column_id": cols["To Do"], "position": rng.randint(0, 13)}
        else:
            body = {"column_id": rng.choice([cols["In Progress"], cols["Review"]])}
            if rng.random() < 0.7:
                body["position"] = rng.randint(0, 6)
        operations.append((key, body))

    def run(operation):
        key, body = operation
        with TestClient(app) as thread_client:
            response = thread_client.post(f"{API}/tickets/{key}/move", json=body)
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(run, operations))

    for status, body in results:
        assert status in (200, 422), body
        if status == 422:
            assert body["error"]["code"] == "invalid_move", body
    assert any(status == 200 for status, _ in results)

    columns = board_columns(client, board["id"])  # asserts positions are exactly 0..n-1
    seen = [t["key"] for tickets in columns.values() for t in tickets]
    assert sorted(seen) == sorted(keys)
    assert len(seen) == len(set(seen))


def test_failed_move_rolls_back_positions_and_history(app, client, monkeypatch):
    board = make_board(client)
    cols = {c["name"]: c["id"] for c in board["columns"]}
    keys = [make_ticket(client, board["id"], title=f"T{i}")["key"] for i in range(3)]
    assert move_ticket(client, keys[2], {"column_id": cols["In Progress"]}).status_code == 200

    before_view = board_columns(client, board["id"])
    before_history = history_count(app)
    before_ticket = client.get(f"{API}/tickets/{keys[1]}").json()

    def boom(*args, **kwargs):
        raise RuntimeError("history write failed")

    monkeypatch.setattr(ticket_service, "record_change", boom)

    with TestClient(app, raise_server_exceptions=False) as failing_client:
        response = failing_client.post(
            f"{API}/tickets/{keys[1]}/move", json={"column_id": cols["In Progress"], "position": 0}
        )
        assert response.status_code == 500, response.text
        assert response.json()["error"]["code"] == "internal_error"

    assert board_columns(client, board["id"]) == before_view
    assert history_count(app) == before_history
    assert client.get(f"{API}/tickets/{keys[1]}").json() == before_ticket

    # Reorders write no history, so they are unaffected by the broken history writer.
    response = move_ticket(client, keys[1], {"column_id": cols["To Do"], "position": 0})
    assert response.status_code == 200, response.text
    assert [t["key"] for t in board_columns(client, board["id"])[cols["To Do"]]] == [
        keys[1],
        keys[0],
    ]
    assert history_count(app) == before_history
