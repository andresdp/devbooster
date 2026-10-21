import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        cors_origins=["http://localhost:5173"],
    )


@pytest.fixture
def app(settings):
    """A fresh app on an isolated, empty, unseeded database."""
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


def make_board(client, name="Board"):
    response = client.post("/api/v1/boards", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()


def make_ticket(client, board_id, **fields):
    fields.setdefault("title", "Ticket")
    response = client.post(f"/api/v1/boards/{board_id}/tickets", json=fields)
    assert response.status_code == 201, response.text
    return response.json()
