from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import create_app
from app.models import HistoryEntry
from tests.conftest import board_columns, make_board, make_ticket, move_ticket

API = "/api/v1"


def setup_board(client, titles=("A", "B", "C"), name="Board"):
    board = make_board(client, name)
    columns = {c["name"]: c["id"] for c in board["columns"]}
    keys = {title: make_ticket(client, board["id"], title=title)["key"] for title in titles}
    return board, columns, keys


def keys_by_column(client, board_id):
    return {cid: [t["key"] for t in ts] for cid, ts in board_columns(client, board_id).items()}


def history_of(app, key):
    ticket_id = int(key.removeprefix("TKT-"))
    with Session(app.state.engine) as session:
        entries = session.exec(
            select(HistoryEntry)
            .where(HistoryEntry.ticket_id == ticket_id)
            .order_by(HistoryEntry.id)
        ).all()
        return [(e.from_column_id, e.to_column_id) for e in entries]


def get_ticket(client, key):
    response = client.get(f"{API}/tickets/{key}")
    assert response.status_code == 200, response.text
    return response.json()


def test_move_to_other_column_defaults_to_bottom(client):
    board, cols, k = setup_board(client)

    response = move_ticket(client, k["B"], {"column_id": cols["In Progress"]})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["key"] == k["B"]
    assert body["board_id"] == board["id"]
    assert body["column_id"] == cols["In Progress"]
    assert body["position"] == 0
    assert keys_by_column(client, board["id"]) == {
        cols["To Do"]: [k["A"], k["C"]],
        cols["In Progress"]: [k["B"]],
        cols["Review"]: [],
        cols["Done"]: [],
    }

    # A second move without position lands below B.
    response = move_ticket(client, k["A"], {"column_id": cols["In Progress"]})
    assert response.status_code == 200, response.text
    assert response.json()["position"] == 1
    assert keys_by_column(client, board["id"])[cols["In Progress"]] == [k["B"], k["A"]]
    assert keys_by_column(client, board["id"])[cols["To Do"]] == [k["C"]]


def test_move_with_position_inserts_and_shifts(client):
    board, cols, k = setup_board(client, titles=("A", "B", "C", "D", "E", "F"))
    target = cols["In Progress"]
    for title in ("A", "B", "C"):
        assert move_ticket(client, k[title], {"column_id": target}).status_code == 200

    response = move_ticket(client, k["D"], {"column_id": target, "position": 0})
    assert response.status_code == 200, response.text
    assert response.json()["position"] == 0
    assert keys_by_column(client, board["id"])[target] == [k["D"], k["A"], k["B"], k["C"]]

    response = move_ticket(client, k["E"], {"column_id": target, "position": 2})
    assert response.status_code == 200, response.text
    assert response.json()["position"] == 2
    assert keys_by_column(client, board["id"])[target] == [k["D"], k["A"], k["E"], k["B"], k["C"]]

    # position == n appends
    response = move_ticket(client, k["F"], {"column_id": target, "position": 5})
    assert response.status_code == 200, response.text
    assert response.json()["position"] == 5
    view = keys_by_column(client, board["id"])
    assert view[target] == [k["D"], k["A"], k["E"], k["B"], k["C"], k["F"]]
    assert view[cols["To Do"]] == []


def test_reorder_third_ticket_to_top(client):
    board, cols, k = setup_board(client)

    response = move_ticket(client, k["C"], {"column_id": cols["To Do"], "position": 0})

    assert response.status_code == 200, response.text
    assert response.json()["column_id"] == cols["To Do"]
    assert response.json()["position"] == 0
    assert keys_by_column(client, board["id"])[cols["To Do"]] == [k["C"], k["A"], k["B"]]


def test_reorder_without_position_goes_last(client):
    board, cols, k = setup_board(client)

    response = move_ticket(client, k["A"], {"column_id": cols["To Do"]})

    assert response.status_code == 200, response.text
    assert response.json()["position"] == 2
    assert keys_by_column(client, board["id"])[cols["To Do"]] == [k["B"], k["C"], k["A"]]


def test_reorder_shifts_in_both_directions(client):
    board, cols, k = setup_board(client, titles=("A", "B", "C", "D"))
    todo = cols["To Do"]

    assert move_ticket(client, k["A"], {"column_id": todo, "position": 2}).status_code == 200
    assert keys_by_column(client, board["id"])[todo] == [k["B"], k["C"], k["A"], k["D"]]

    assert move_ticket(client, k["D"], {"column_id": todo, "position": 1}).status_code == 200
    assert keys_by_column(client, board["id"])[todo] == [k["B"], k["D"], k["C"], k["A"]]


def test_reorder_to_current_position_is_a_noop(app, client):
    board, cols, k = setup_board(client)
    before_ticket = get_ticket(client, k["B"])
    before_view = board_columns(client, board["id"])
    before_history = history_of(app, k["B"])

    response = move_ticket(client, k["B"], {"column_id": cols["To Do"], "position": 1})

    assert response.status_code == 200, response.text
    assert response.json() == before_ticket
    assert get_ticket(client, k["B"])["updated_at"] == before_ticket["updated_at"]
    assert board_columns(client, board["id"]) == before_view
    assert history_of(app, k["B"]) == before_history


def test_single_ticket_column_accepts_only_position_zero(client):
    board, cols, k = setup_board(client, titles=("A",))

    ok = move_ticket(client, k["A"], {"column_id": cols["To Do"], "position": 0})
    assert ok.status_code == 200, ok.text
    assert ok.json()["position"] == 0

    bad = move_ticket(client, k["A"], {"column_id": cols["To Do"], "position": 1})
    assert bad.status_code == 422, bad.text
    assert bad.json()["error"]["code"] == "invalid_move"
    assert keys_by_column(client, board["id"])[cols["To Do"]] == [k["A"]]


def test_empty_target_column_accepts_zero_or_no_position(client):
    board, cols, k = setup_board(client)

    response = move_ticket(client, k["A"], {"column_id": cols["Review"], "position": 0})
    assert response.status_code == 200, response.text
    assert response.json()["position"] == 0

    response = move_ticket(client, k["B"], {"column_id": cols["Done"]})
    assert response.status_code == 200, response.text
    assert response.json()["position"] == 0

    view = keys_by_column(client, board["id"])
    assert view[cols["Review"]] == [k["A"]]
    assert view[cols["Done"]] == [k["B"]]
    assert view[cols["To Do"]] == [k["C"]]


def test_empty_target_column_rejects_position_one(client):
    board, cols, k = setup_board(client)

    response = move_ticket(client, k["A"], {"column_id": cols["Review"], "position": 1})

    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "invalid_move"
    assert keys_by_column(client, board["id"])[cols["Review"]] == []


def test_invalid_moves_are_rejected_and_leave_state_unchanged(client):
    board, cols, k = setup_board(client, titles=("A", "B", "C", "D"))
    other = make_board(client, "Other board")
    other_column = other["columns"][0]["id"]
    assert move_ticket(client, k["D"], {"column_id": cols["In Progress"]}).status_code == 200
    # To Do has 3 tickets (A, B, C); In Progress has 1 (D)

    cases = {
        "column of another board": {"column_id": other_column},
        "unknown column": {"column_id": 999_999},
        "column id beyond 64-bit": {"column_id": 2**70},
        "cross-column position n+1": {"column_id": cols["In Progress"], "position": 2},
        "reorder position n": {"column_id": cols["To Do"], "position": 3},
        "reorder far out of range": {"column_id": cols["To Do"], "position": 50},
    }
    before_view = board_columns(client, board["id"])
    before_other = board_columns(client, other["id"])
    before_ticket = get_ticket(client, k["A"])

    for label, body in cases.items():
        response = move_ticket(client, k["A"], body)
        assert response.status_code == 422, (label, response.text)
        error = response.json()["error"]
        assert error["code"] == "invalid_move", label
        assert error["message"], label
        assert error["details"] is None, label
        assert board_columns(client, board["id"]) == before_view, label
        assert board_columns(client, other["id"]) == before_other, label
        assert get_ticket(client, k["A"]) == before_ticket, label


def test_malformed_bodies_are_validation_errors(client):
    board, cols, k = setup_board(client)
    before_view = board_columns(client, board["id"])
    before_ticket = get_ticket(client, k["A"])
    todo = cols["To Do"]

    bodies = [
        {"column_id": todo, "position": -1},
        {"column_id": todo, "position": 1.0},
        {"column_id": todo, "position": "1"},
        {"column_id": todo, "position": True},
        {"column_id": None},
        {"column_id": "1"},
        {"column_id": str(todo)},
        {"column_id": True},
        {},
        {"position": 0},
        {"column_id": todo, "extra": 1},
        {"column_id": todo, "board_id": board["id"]},
    ]
    for body in bodies:
        response = move_ticket(client, k["A"], body)
        assert response.status_code == 422, (body, response.text)
        error = response.json()["error"]
        assert error["code"] == "validation_error", body
        assert isinstance(error["details"], list) and error["details"], body
        assert all({"field", "message"} <= set(d) for d in error["details"]), body
        assert board_columns(client, board["id"]) == before_view, body
        assert get_ticket(client, k["A"]) == before_ticket, body

    response = client.post(
        f"{API}/tickets/{k['A']}/move",
        content="not json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_unknown_key_is_404(client):
    board, cols, _ = setup_board(client)

    response = move_ticket(client, "TKT-999", {"column_id": cols["In Progress"]})

    assert response.status_code == 404, response.text
    assert response.json()["error"]["code"] == "not_found"
    assert response.json()["error"]["details"] is None

    response = move_ticket(client, "TKT-99999999999999999999", {"column_id": cols["In Progress"]})
    assert response.status_code == 404, response.text
    assert response.json()["error"]["code"] == "not_found"


def test_malformed_key_is_422(client):
    board, cols, _ = setup_board(client)

    for key in ("tkt-1", "TKT-0", "TKT-012", "TKT-", "abc"):
        response = move_ticket(client, key, {"column_id": cols["In Progress"]})
        assert response.status_code == 422, (key, response.text)
        assert response.json()["error"]["code"] == "validation_error", key


def test_cross_column_move_bumps_updated_at_and_records_history(app, client):
    board, cols, k = setup_board(client)
    before = get_ticket(client, k["A"])
    assert history_of(app, k["A"]) == [(None, cols["To Do"])]

    response = move_ticket(client, k["A"], {"column_id": cols["Review"]})

    assert response.status_code == 200, response.text
    after = response.json()
    assert after["updated_at"] > before["updated_at"]
    assert after["created_at"] == before["created_at"]
    assert get_ticket(client, k["A"]) == after
    assert history_of(app, k["A"]) == [(None, cols["To Do"]), (cols["To Do"], cols["Review"])]

    # A same-column reorder changes positions only: no history entry.
    assert (
        move_ticket(client, k["C"], {"column_id": cols["To Do"], "position": 0}).status_code == 200
    )
    assert history_of(app, k["C"]) == [(None, cols["To Do"])]


def test_order_persists_when_the_board_is_reloaded(client, settings):
    board, cols, k = setup_board(client, titles=("A", "B", "C", "D", "E"))
    assert (
        move_ticket(client, k["E"], {"column_id": cols["To Do"], "position": 0}).status_code == 200
    )
    assert move_ticket(client, k["B"], {"column_id": cols["In Progress"]}).status_code == 200
    assert (
        move_ticket(client, k["D"], {"column_id": cols["In Progress"], "position": 0}).status_code
        == 200
    )
    assert move_ticket(client, k["A"], {"column_id": cols["Review"]}).status_code == 200

    expected = {
        cols["To Do"]: [k["E"], k["C"]],
        cols["In Progress"]: [k["D"], k["B"]],
        cols["Review"]: [k["A"]],
        cols["Done"]: [],
    }
    assert keys_by_column(client, board["id"]) == expected
    assert keys_by_column(client, board["id"]) == expected

    with TestClient(create_app(settings)) as fresh_client:
        assert keys_by_column(fresh_client, board["id"]) == expected
