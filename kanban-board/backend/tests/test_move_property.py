"""SC-004: randomized move/reorder sequences checked against an in-memory list-of-lists model."""

import random

import pytest

from tests.conftest import board_columns, make_board, make_ticket, move_ticket

N_SEQUENCES = 100
STEPS = 20


def _assert_matches_model(client, model, context):
    for board_id, columns in model.items():
        observed = {
            cid: [t["key"] for t in ts] for cid, ts in board_columns(client, board_id).items()
        }
        assert observed == columns, context


@pytest.mark.parametrize("seed", range(N_SEQUENCES))
def test_random_move_sequences_match_the_model(client, seed):
    rng = random.Random(seed)
    model: dict[int, dict[int, list[str]]] = {}  # board id -> column id -> ordered keys
    first_column: dict[int, int] = {}
    ticket_board: dict[str, int] = {}

    for b in range(2):
        board = make_board(client, f"Board {b}")
        columns = sorted(board["columns"], key=lambda c: c["position"])
        model[board["id"]] = {c["id"]: [] for c in columns}
        first_column[board["id"]] = columns[0]["id"]
        for i in range(rng.randint(2, 6)):
            key = make_ticket(client, board["id"], title=f"T{b}-{i}")["key"]
            model[board["id"]][columns[0]["id"]].append(key)
            ticket_board[key] = board["id"]

    all_columns = [cid for columns in model.values() for cid in columns]
    unknown_column = max(all_columns) + 1000

    def locate(key):
        board_id = ticket_board[key]
        for cid, keys in model[board_id].items():
            if key in keys:
                return board_id, cid, keys.index(key)
        raise AssertionError(key)

    for step in range(STEPS):
        context = f"seed={seed} step={step}"

        if rng.random() < 0.1:
            board_id = rng.choice(list(model))
            key = make_ticket(client, board_id, title=f"new-{step}")["key"]
            model[board_id][first_column[board_id]].append(key)
            ticket_board[key] = board_id
            _assert_matches_model(client, model, context)
            continue

        key = rng.choice(list(ticket_board))
        board_id, source, _index = locate(key)
        r = rng.random()
        if r < 0.1:
            target = unknown_column
        elif r < 0.2:
            other_board = next(b for b in model if b != board_id)
            target = rng.choice(list(model[other_board]))
        elif r < 0.5:
            target = source
        else:
            target = rng.choice(list(model[board_id]))

        same_column = target == source
        target_known = target in model[board_id]
        n = len(model[board_id][target]) if target_known else 0
        upper = n - 1 if same_column else n

        p = rng.random()
        if p < 0.25:
            position = None
        elif p < 0.8:
            position = rng.randint(0, max(upper, 0))
        elif p < 0.9:
            position = upper + 1
        else:
            position = -rng.randint(1, 3)

        body = {"column_id": target}
        if position is not None:
            body["position"] = position
        response = move_ticket(client, key, body)
        context = f"{context} key={key} body={body} -> {response.status_code} {response.text}"

        if position is not None and position < 0:
            assert response.status_code == 422, context
            assert response.json()["error"]["code"] == "validation_error", context
        elif not target_known:
            assert response.status_code == 422, context
            assert response.json()["error"]["code"] == "invalid_move", context
        else:
            effective = upper if position is None else position
            if effective > upper:
                assert response.status_code == 422, context
                assert response.json()["error"]["code"] == "invalid_move", context
            else:
                assert response.status_code == 200, context
                model[board_id][source].remove(key)
                model[board_id][target].insert(effective, key)
                assert response.json()["column_id"] == target, context
                assert response.json()["position"] == effective, context

        _assert_matches_model(client, model, context)
