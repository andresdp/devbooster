import time

import pytest

from tests.conftest import make_board, make_ticket

API = "/api/v1"
TICKET_FIELDS = {
    "key",
    "title",
    "description",
    "type",
    "priority",
    "assignee",
    "board_id",
    "column_id",
    "position",
    "created_at",
    "updated_at",
}


@pytest.fixture
def board(client):
    return make_board(client, "Main")


def first_column_id(client, board_id):
    return client.get(f"{API}/boards/{board_id}").json()["columns"][0]["id"]


def test_create_with_only_title_uses_defaults(client, board):
    response = client.post(f"{API}/boards/{board['id']}/tickets", json={"title": "Fix login"})
    assert response.status_code == 201
    ticket = response.json()
    assert set(ticket) == TICKET_FIELDS
    assert ticket["key"] == "TKT-1"
    assert ticket["title"] == "Fix login"
    assert ticket["description"] == ""
    assert ticket["type"] == "task"
    assert ticket["priority"] == "medium"
    assert ticket["assignee"] is None
    assert ticket["board_id"] == board["id"]
    assert ticket["column_id"] == board["columns"][0]["id"]
    assert ticket["position"] == 0
    assert ticket["created_at"].endswith("Z") and ticket["updated_at"].endswith("Z")


def test_create_with_all_fields(client, board):
    ticket = make_ticket(
        client,
        board["id"],
        title="Crash",
        description="Details",
        type="bug",
        priority="critical",
        assignee="Ana",
    )
    assert (ticket["type"], ticket["priority"], ticket["assignee"]) == ("bug", "critical", "Ana")
    assert ticket["description"] == "Details"


def test_positions_and_keys_increase(client, board):
    first = make_ticket(client, board["id"])
    second = make_ticket(client, board["id"])
    assert (first["key"], first["position"]) == ("TKT-1", 0)
    assert (second["key"], second["position"]) == ("TKT-2", 1)


def test_keys_are_global_across_boards(client, board):
    other = make_board(client, "Other")
    a = make_ticket(client, board["id"])
    b = make_ticket(client, other["id"])
    c = make_ticket(client, board["id"])
    assert [a["key"], b["key"], c["key"]] == ["TKT-1", "TKT-2", "TKT-3"]
    assert b["position"] == 0 and c["position"] == 1


def test_text_fields_are_trimmed(client, board):
    ticket = make_ticket(
        client, board["id"], title="  T  ", description="  D \n", assignee="  Bob  "
    )
    assert (ticket["title"], ticket["description"], ticket["assignee"]) == ("T", "D", "Bob")


@pytest.mark.parametrize(
    "field, limit", [("title", 200), ("description", 10_000), ("assignee", 100)]
)
def test_length_limits(client, board, field, limit):
    path = f"{API}/boards/{board['id']}/tickets"
    ok = client.post(path, json={"title": "t", field: "x" * limit})
    assert ok.status_code == 201
    too_long = client.post(path, json={"title": "t", field: "x" * (limit + 1)})
    assert too_long.status_code == 422
    assert too_long.json()["error"]["details"][0]["field"] == field


def test_limits_count_code_points(client, board):
    path = f"{API}/boards/{board['id']}/tickets"
    assert client.post(path, json={"title": "😀" * 200}).status_code == 201
    assert client.post(path, json={"title": "😀" * 201}).status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "   "},
        {"title": ""},
        {},
        {"description": "no title"},
        {"title": "t", "type": "epic"},
        {"title": "t", "priority": "urgent"},
        {"title": "t", "type": None},
        {"title": "t", "priority": None},
        {"title": "t", "description": None},
        {"title": 123},
        {"title": "t", "extra": 1},
        {"title": "t", "column_id": 1},
        {"title": "t", "assignee": 5},
    ],
)
def test_invalid_create_creates_nothing(client, board, payload):
    response = client.post(f"{API}/boards/{board['id']}/tickets", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    detail = client.get(f"{API}/boards/{board['id']}").json()
    assert all(c["tickets"] == [] for c in detail["columns"])


@pytest.mark.parametrize("assignee", [None, "", "   "])
def test_blank_or_null_assignee_is_unassigned(client, board, assignee):
    ticket = make_ticket(client, board["id"], assignee=assignee)
    assert ticket["assignee"] is None


def test_create_on_unknown_board_is_404(client):
    response = client.post(f"{API}/boards/999/tickets", json={"title": "t"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_board_view_groups_tickets_by_column(client, board):
    a = make_ticket(client, board["id"], title="A", type="bug", priority="high", assignee="Z")
    b = make_ticket(client, board["id"], title="B", type="feature", priority="low")
    detail = client.get(f"{API}/boards/{board['id']}").json()
    todo, *rest = detail["columns"]
    assert todo["name"] == "To Do"
    assert todo["tickets"] == [a, b]
    assert all(c["tickets"] == [] for c in rest)


def test_get_ticket_by_key(client, board):
    ticket = make_ticket(client, board["id"], title="Look me up")
    response = client.get(f"{API}/tickets/{ticket['key']}")
    assert response.status_code == 200
    assert response.json() == ticket
    assert "comments" not in response.json() and "history" not in response.json()


def test_unknown_key_is_404(client):
    response = client.get(f"{API}/tickets/TKT-42")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_huge_key_is_404_not_a_crash(client):
    response = client.get(f"{API}/tickets/TKT-99999999999999999999")
    assert response.status_code == 404


@pytest.mark.parametrize("key", ["tkt-1", "TKT-0", "TKT-012", "TKT-", "abc", "TKT-1a", "TKT--1"])
def test_malformed_key_is_422(client, key):
    for method in (client.get, client.patch):
        kwargs = {"json": {"title": "x"}} if method == client.patch else {}
        response = method(f"{API}/tickets/{key}", **kwargs)
        assert response.status_code == 422, key
        assert response.json()["error"]["code"] == "validation_error"


def test_patch_edits_each_field(client, board):
    ticket = make_ticket(client, board["id"], title="Old", description="d", assignee="A")
    url = f"{API}/tickets/{ticket['key']}"
    assert client.patch(url, json={"title": " New "}).json()["title"] == "New"
    assert client.patch(url, json={"description": "new d"}).json()["description"] == "new d"
    assert client.patch(url, json={"type": "bug"}).json()["type"] == "bug"
    assert client.patch(url, json={"priority": "high"}).json()["priority"] == "high"
    assert client.patch(url, json={"assignee": "Bea"}).json()["assignee"] == "Bea"
    final = client.get(url).json()
    assert (final["title"], final["description"], final["type"]) == ("New", "new d", "bug")


def test_patch_omitted_fields_unchanged(client, board):
    ticket = make_ticket(client, board["id"], title="T", priority="high", assignee="A")
    updated = client.patch(f"{API}/tickets/{ticket['key']}", json={"title": "T2"}).json()
    assert (updated["priority"], updated["assignee"]) == ("high", "A")


def test_patch_can_clear_description_and_assignee(client, board):
    ticket = make_ticket(client, board["id"], description="text", assignee="A")
    url = f"{API}/tickets/{ticket['key']}"
    assert client.patch(url, json={"description": ""}).json()["description"] == ""
    assert client.patch(url, json={"assignee": None}).json()["assignee"] is None
    client.patch(url, json={"assignee": "B"})
    assert client.patch(url, json={"assignee": "  "}).json()["assignee"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"title": ""},
        {"title": "   "},
        {"title": None},
        {"description": None},
        {"type": None},
        {"priority": None},
        {"type": "epic"},
        {"board_id": 2},
        {"column_id": 2},
        {"position": 0},
        {"key": "TKT-9"},
        {"title": "x" * 201},
    ],
)
def test_invalid_patch_leaves_ticket_unchanged(client, board, payload):
    ticket = make_ticket(client, board["id"], title="Keep")
    time.sleep(0.01)
    response = client.patch(f"{API}/tickets/{ticket['key']}", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert client.get(f"{API}/tickets/{ticket['key']}").json() == ticket


def test_patch_never_moves_the_ticket_and_bumps_updated_at(client, board):
    ticket = make_ticket(client, board["id"])
    time.sleep(0.01)
    updated = client.patch(f"{API}/tickets/{ticket['key']}", json={"title": "Changed"}).json()
    for field in ("key", "board_id", "column_id", "position", "created_at"):
        assert updated[field] == ticket[field]
    assert updated["updated_at"] > ticket["updated_at"]


def test_patch_unknown_key_is_404(client):
    response = client.patch(f"{API}/tickets/TKT-5", json={"title": "x"})
    assert response.status_code == 404
