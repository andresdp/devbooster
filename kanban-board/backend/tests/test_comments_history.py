from datetime import UTC, datetime

import pytest
from sqlmodel import Session

from app.models import Comment
from tests.conftest import board_columns, make_board, make_ticket, move_ticket

API = "/api/v1"
COMMENT_FIELDS = {"id", "ticket_key", "author", "text", "created_at"}
HISTORY_FIELDS = {"id", "ticket_key", "from_column", "to_column", "changed_at"}


@pytest.fixture
def board(client):
    return make_board(client, "Main")


@pytest.fixture
def ticket(client, board):
    return make_ticket(client, board["id"], title="Discuss me")


def add_comment(client, key, author="Ana", text="Looks good"):
    return client.post(f"{API}/tickets/{key}/comments", json={"author": author, "text": text})


def list_comments(client, key):
    return client.get(f"{API}/tickets/{key}/comments")


def list_history(client, key):
    return client.get(f"{API}/tickets/{key}/history")


def history_of(client, key):
    response = list_history(client, key)
    assert response.status_code == 200, response.text
    return response.json()


def column_by_name(board, name):
    return next(c for c in board["columns"] if c["name"] == name)


def assert_validation_error(response, field):
    assert response.status_code == 422, response.text
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert field in {d["field"] for d in error["details"]}, error


# --- Comments: create and list -------------------------------------------------------------


def test_add_comment_returns_201_with_shape(client, ticket):
    response = add_comment(client, ticket["key"], author="Ana", text="First!")
    assert response.status_code == 201, response.text
    comment = response.json()
    assert set(comment) == COMMENT_FIELDS
    assert comment["id"] == 1
    assert comment["ticket_key"] == ticket["key"]
    assert comment["author"] == "Ana"
    assert comment["text"] == "First!"
    assert comment["created_at"].endswith("Z")


def test_list_comments_is_chronological(client, ticket):
    for text in ("one", "two", "three"):
        assert add_comment(client, ticket["key"], text=text).status_code == 201
    response = list_comments(client, ticket["key"])
    assert response.status_code == 200
    comments = response.json()
    assert [c["text"] for c in comments] == ["one", "two", "three"]
    assert [c["id"] for c in comments] == [1, 2, 3]
    assert comments[0]["created_at"] <= comments[1]["created_at"] <= comments[2]["created_at"]
    assert all(set(c) == COMMENT_FIELDS for c in comments)


def test_list_comments_orders_by_timestamp_then_id(app, client, ticket):
    """Timestamp wins over insertion order; equal timestamps fall back to id."""
    ticket_id = int(ticket["key"].removeprefix("TKT-"))
    t0 = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
    t1 = datetime(2026, 1, 1, 12, 0, 1, tzinfo=UTC)
    with Session(app.state.engine) as session:
        session.add(Comment(ticket_id=ticket_id, author="A", text="later", created_at=t1))
        session.add(Comment(ticket_id=ticket_id, author="A", text="tie-1", created_at=t0))
        session.add(Comment(ticket_id=ticket_id, author="A", text="tie-2", created_at=t0))
        session.commit()
    comments = list_comments(client, ticket["key"]).json()
    assert [c["text"] for c in comments] == ["tie-1", "tie-2", "later"]
    assert comments[0]["id"] < comments[1]["id"]


def test_list_comments_empty_for_new_ticket(client, ticket):
    response = list_comments(client, ticket["key"])
    assert response.status_code == 200
    assert response.json() == []


def test_comments_do_not_leak_across_tickets(client, board):
    first = make_ticket(client, board["id"], title="First")
    second = make_ticket(client, board["id"], title="Second")
    add_comment(client, first["key"], text="on first")
    add_comment(client, second["key"], text="on second")
    add_comment(client, first["key"], text="again on first")
    assert [c["text"] for c in list_comments(client, first["key"]).json()] == [
        "on first",
        "again on first",
    ]
    assert [c["text"] for c in list_comments(client, second["key"]).json()] == ["on second"]
    assert all(
        c["ticket_key"] == second["key"] for c in list_comments(client, second["key"]).json()
    )


# --- Comments: validation -------------------------------------------------------------------


def test_author_and_text_are_trimmed(client, ticket):
    response = add_comment(client, ticket["key"], author="  Ana  ", text="\n  hi there \t")
    assert response.status_code == 201
    assert response.json()["author"] == "Ana"
    assert response.json()["text"] == "hi there"


@pytest.mark.parametrize("field", ["author", "text"])
@pytest.mark.parametrize("value", ["", "   ", "\n\t"])
def test_empty_or_whitespace_only_rejected(client, ticket, field, value):
    body = {"author": "Ana", "text": "hello"}
    body[field] = value
    response = client.post(f"{API}/tickets/{ticket['key']}/comments", json=body)
    assert_validation_error(response, field)
    assert list_comments(client, ticket["key"]).json() == []


def test_author_length_limit(client, ticket):
    assert add_comment(client, ticket["key"], author="a" * 100).status_code == 201
    assert_validation_error(add_comment(client, ticket["key"], author="a" * 101), "author")


def test_text_length_limit(client, ticket):
    assert add_comment(client, ticket["key"], text="t" * 5_000).status_code == 201
    assert_validation_error(add_comment(client, ticket["key"], text="t" * 5_001), "text")


def test_length_limits_count_code_points_after_trim(client, ticket):
    assert add_comment(client, ticket["key"], author="  " + "é" * 100 + "  ").status_code == 201
    assert_validation_error(add_comment(client, ticket["key"], author="é" * 101), "author")


@pytest.mark.parametrize(
    "body, field",
    [
        ({"author": 1, "text": "hello"}, "author"),
        ({"author": "Ana", "text": ["hello"]}, "text"),
        ({"author": None, "text": "hello"}, "author"),
        ({"author": "Ana", "text": None}, "text"),
        ({"text": "hello"}, "author"),
        ({"author": "Ana"}, "text"),
        ({"author": "Ana", "text": "hello", "ticket_key": "TKT-9"}, "ticket_key"),
        ({"author": "Ana", "text": "hello", "created_at": "2026-01-01T00:00:00Z"}, "created_at"),
    ],
)
def test_wrong_types_missing_and_unknown_fields_rejected(client, ticket, body, field):
    response = client.post(f"{API}/tickets/{ticket['key']}/comments", json=body)
    assert_validation_error(response, field)


def test_invalid_json_body_rejected(client, ticket):
    response = client.post(
        f"{API}/tickets/{ticket['key']}/comments",
        content=b"{not json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


# --- Comments and history: key handling ------------------------------------------------------


@pytest.mark.parametrize("key", ["TKT-999", "TKT-99999999999999999999"])
def test_unknown_well_formed_key_is_404(client, ticket, key):
    for response in (
        add_comment(client, key),
        list_comments(client, key),
        list_history(client, key),
    ):
        assert response.status_code == 404, response.text
        error = response.json()["error"]
        assert error["code"] == "not_found"
        assert key in error["message"]
        assert error["details"] is None


@pytest.mark.parametrize("key", ["tkt-1", "TKT-0", "TKT-01", "TKT-", "1", "TKT-1x", "TKT- 1"])
def test_malformed_key_is_422(client, ticket, key):
    for response in (
        add_comment(client, key),
        list_comments(client, key),
        list_history(client, key),
    ):
        assert response.status_code == 422, response.text
        error = response.json()["error"]
        assert error["code"] == "validation_error"
        assert error["details"][0]["field"] == "key"


# --- History ------------------------------------------------------------------------------


def test_new_ticket_history_has_only_creation_entry(client, board, ticket):
    response = list_history(client, ticket["key"])
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 1
    entry = entries[0]
    assert set(entry) == HISTORY_FIELDS
    assert entry["ticket_key"] == ticket["key"]
    assert entry["from_column"] is None
    todo = column_by_name(board, "To Do")
    assert entry["to_column"] == {"id": todo["id"], "name": "To Do"}
    assert entry["changed_at"].endswith("Z")


def test_history_records_each_column_change_in_order(client, board, ticket):
    todo = column_by_name(board, "To Do")
    in_progress = column_by_name(board, "In Progress")
    review = column_by_name(board, "Review")
    assert move_ticket(client, ticket["key"], {"column_id": in_progress["id"]}).status_code == 200
    assert move_ticket(client, ticket["key"], {"column_id": review["id"]}).status_code == 200

    entries = history_of(client, ticket["key"])
    assert len(entries) == 3
    assert [(e["from_column"], e["to_column"]) for e in entries] == [
        (None, {"id": todo["id"], "name": "To Do"}),
        ({"id": todo["id"], "name": "To Do"}, {"id": in_progress["id"], "name": "In Progress"}),
        (
            {"id": in_progress["id"], "name": "In Progress"},
            {"id": review["id"], "name": "Review"},
        ),
    ]
    assert [e["id"] for e in entries] == sorted(e["id"] for e in entries)
    assert entries[0]["changed_at"] <= entries[1]["changed_at"] <= entries[2]["changed_at"]
    assert all(e["ticket_key"] == ticket["key"] for e in entries)


def test_same_column_reorder_adds_no_history_entry(client, board):
    first = make_ticket(client, board["id"], title="First")
    second = make_ticket(client, board["id"], title="Second")
    todo = column_by_name(board, "To Do")
    assert (
        move_ticket(client, second["key"], {"column_id": todo["id"], "position": 0}).status_code
        == 200
    )
    assert [t["key"] for t in board_columns(client, board["id"])[todo["id"]]] == [
        second["key"],
        first["key"],
    ]
    assert len(history_of(client, second["key"])) == 1
    assert len(history_of(client, first["key"])) == 1


def test_noop_move_adds_no_history_entry(client, board, ticket):
    todo = column_by_name(board, "To Do")
    assert (
        move_ticket(client, ticket["key"], {"column_id": todo["id"], "position": 0}).status_code
        == 200
    )
    assert move_ticket(client, ticket["key"], {"column_id": todo["id"]}).status_code == 200
    assert len(history_of(client, ticket["key"])) == 1


def test_rejected_move_adds_no_history_entry(client, board, ticket):
    other = make_board(client, "Other")
    foreign = column_by_name(other, "Done")
    assert move_ticket(client, ticket["key"], {"column_id": foreign["id"]}).status_code == 422
    assert len(history_of(client, ticket["key"])) == 1


def test_history_is_per_ticket(client, board):
    first = make_ticket(client, board["id"], title="First")
    second = make_ticket(client, board["id"], title="Second")
    done = column_by_name(board, "Done")
    assert move_ticket(client, first["key"], {"column_id": done["id"]}).status_code == 200
    assert len(history_of(client, first["key"])) == 2
    second_history = history_of(client, second["key"])
    assert len(second_history) == 1
    assert all(e["ticket_key"] == second["key"] for e in second_history)
