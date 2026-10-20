import time

from sqlalchemy import event

from tests.conftest import make_board, make_ticket

API = "/api/v1"


def test_board_with_200_tickets_is_fast_and_bounded(app, client):
    board = make_board(client)
    for i in range(200):
        make_ticket(client, board["id"], title=f"T{i}")

    queries = []

    @event.listens_for(app.state.engine, "before_cursor_execute")
    def count(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    start = time.perf_counter()
    response = client.get(f"{API}/boards/{board['id']}")
    elapsed = time.perf_counter() - start

    assert response.status_code == 200
    todo = response.json()["columns"][0]
    assert [t["position"] for t in todo["tickets"]] == list(range(200))
    assert elapsed < 2
    selects = [q for q in queries if q.lstrip().upper().startswith("SELECT")]
    assert len(selects) <= 5, selects
