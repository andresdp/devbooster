from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from app.services import tickets as ticket_service
from tests.conftest import make_board

API = "/api/v1"


def test_concurrent_creates_get_distinct_keys(app, client):
    board = make_board(client)

    def create(i):
        with TestClient(app) as thread_client:
            response = thread_client.post(
                f"{API}/boards/{board['id']}/tickets", json={"title": f"T{i}"}
            )
            return response.status_code, response.json()

    with ThreadPoolExecutor(max_workers=20) as pool:
        results = list(pool.map(create, range(25)))

    assert all(status == 201 for status, _ in results)
    keys = [body["key"] for _, body in results]
    assert len(set(keys)) == 25
    positions = sorted(body["position"] for _, body in results)
    assert positions == list(range(25))


def test_sequential_creates_are_unique_and_increasing(client):
    board = make_board(client)
    ids = []
    for i in range(1000):
        response = client.post(f"{API}/boards/{board['id']}/tickets", json={"title": f"T{i}"})
        assert response.status_code == 201
        ids.append(int(response.json()["key"].removeprefix("TKT-")))
    assert ids == sorted(set(ids))
    assert ids == list(range(1, 1001))


def test_failed_create_leaves_nothing_behind(app, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("history write failed")

    monkeypatch.setattr(ticket_service, "record_change", boom)
    with TestClient(app, raise_server_exceptions=False) as client:
        board = make_board(client)
        response = client.post(f"{API}/boards/{board['id']}/tickets", json={"title": "Doomed"})
        assert response.status_code == 500
        assert response.json()["error"]["code"] == "internal_error"
        detail = client.get(f"{API}/boards/{board['id']}").json()
        assert all(c["tickets"] == [] for c in detail["columns"])

    from sqlmodel import Session, func, select

    from app.models import HistoryEntry, Ticket

    with Session(app.state.engine) as session:
        assert session.exec(select(func.count()).select_from(Ticket)).one() == 0
        assert session.exec(select(func.count()).select_from(HistoryEntry)).one() == 0
