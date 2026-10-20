import pytest

from tests.conftest import make_board

API = "/api/v1"
COLUMN_NAMES = ["To Do", "In Progress", "Review", "Done"]


def test_create_board_has_default_columns(client):
    response = client.post(f"{API}/boards", json={"name": "Alpha"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Alpha"
    assert body["id"]
    assert body["created_at"].endswith("Z")
    assert [(c["name"], c["position"]) for c in body["columns"]] == [
        (name, i) for i, name in enumerate(COLUMN_NAMES)
    ]
    assert all(set(c) == {"id", "name", "position"} for c in body["columns"])


def test_name_is_trimmed(client):
    assert make_board(client, "  Padded  ")["name"] == "Padded"


@pytest.mark.parametrize("name", ["", "   ", "\t\n"])
def test_blank_name_rejected(client, name):
    response = client.post(f"{API}/boards", json={"name": name})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert client.get(f"{API}/boards").json() == []


def test_name_length_limit(client):
    assert client.post(f"{API}/boards", json={"name": "x" * 100}).status_code == 201
    response = client.post(f"{API}/boards", json={"name": "x" * 101})
    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "name"


@pytest.mark.parametrize(
    "first, second", [("Team", "team"), ("Team", " TEAM "), ("Straße", "STRASSE")]
)
def test_duplicate_name_is_conflict(client, first, second):
    make_board(client, first)
    response = client.post(f"{API}/boards", json={"name": second})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"
    assert len(client.get(f"{API}/boards").json()) == 1


def test_list_boards_summary_shape(client):
    a = make_board(client, "A")
    b = make_board(client, "B")
    boards = client.get(f"{API}/boards").json()
    assert [x["id"] for x in boards] == [a["id"], b["id"]]
    assert all(set(x) == {"id", "name", "created_at"} for x in boards)


def test_list_boards_empty(client):
    response = client.get(f"{API}/boards")
    assert response.status_code == 200
    assert response.json() == []


def test_empty_board_shows_all_columns(client):
    board = make_board(client, "Empty")
    detail = client.get(f"{API}/boards/{board['id']}").json()
    assert set(detail) == {"id", "name", "created_at", "columns"}
    assert [c["name"] for c in detail["columns"]] == COLUMN_NAMES
    assert [c["position"] for c in detail["columns"]] == [0, 1, 2, 3]
    assert all(c["tickets"] == [] for c in detail["columns"])


def test_unknown_board_is_404(client):
    response = client.get(f"{API}/boards/999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_non_integer_board_id_is_422(client):
    response = client.get(f"{API}/boards/abc")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize(
    "payload", [{"name": 5}, {"name": None}, {}, {"name": "ok", "extra": 1}, {"name": ["a"]}]
)
def test_bad_payloads_rejected(client, payload):
    response = client.post(f"{API}/boards", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert client.get(f"{API}/boards").json() == []


def test_delete_is_not_supported(client):
    board = make_board(client)
    response = client.delete(f"{API}/boards/{board['id']}")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "http_error"
