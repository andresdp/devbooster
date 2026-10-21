# Quickstart: Backend Validation Guide

Prerequisites: [uv](https://docs.astral.sh/uv/) installed. Everything runs inside `backend/`; no Node tooling is involved.

## Setup and run

```bash
cd backend
uv sync                                   # install runtime + dev dependencies
uv run uvicorn app.main:app --reload      # API on http://localhost:8000
```

The database file is created and the sample board is seeded on first start. Override with `DATABASE_URL` and `CORS_ORIGINS` environment variables.

## Quality gates

```bash
cd backend
uv run pytest                             # all tests, isolated DB
uv run ruff check . && uv run ruff format --check .
uv run python scripts/export_openapi.py   # refresh the committed contract after API changes
```

Expected: tests pass, Ruff reports no issues, and `git diff specs/001-kanban-ticketing/contracts/openapi.json` is empty unless the API changed.

## Validation scenarios

Details of paths and bodies are in [contracts/api.md](./contracts/api.md); entity rules are in [data-model.md](./data-model.md).

1. **Docs and seed (US1)**: open `http://localhost:8000/docs`; `GET /api/v1/boards` lists "Sample Project"; `GET /api/v1/boards/1` shows four columns in order with tickets grouped under them.
2. **Create (US1)**: `POST /api/v1/boards` with a name, then `POST /api/v1/boards/{id}/tickets` with only a `title`. Expect `201`, defaults (`task`, `medium`, unassigned), the next `TKT-n` key, placed at the bottom of To Do. Missing title or `type: "epic"` returns `422` with the uniform error body.
3. **Fetch/edit (US1)**: `GET /api/v1/tickets/TKT-1`, then `PATCH` its priority; unknown key returns `404`.
4. **Move and reorder (US2)**: `POST /api/v1/tickets/{key}/move` with another column's id (and optional `position`), then with the same column and a new `position`. Reload the board: order persists and positions are `0..n-1`. A column from another board or an out-of-range position returns `422 invalid_move` and changes nothing.
5. **Comments and history (US3)**: `POST` a comment, list comments chronologically; `GET /history` shows a creation entry plus one entry per column change and none for pure reorders.
6. **CORS**: send a request with `Origin: http://localhost:5173`; the response includes `Access-Control-Allow-Origin: http://localhost:5173`. Another origin is not allowed.
7. **Errors**: an unhandled failure returns `500` with `internal_error` and no stack trace.
8. **Restart persistence**: stop and restart the server; boards, tickets, order, comments and history are unchanged and the seed is not duplicated.
