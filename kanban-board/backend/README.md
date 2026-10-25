# Kanban Backend

REST API for the kanban ticketing system (FastAPI + SQLModel + SQLite). All routes live under
`/api/v1`; the human-readable contract is `specs/001-kanban-ticketing/contracts/api.md`.

## Run

```sh
uv sync && uv run uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs

On first start the database file is created and, when no board exists, a sample board
("Sample Project" with tickets, comments and move history) is seeded. Later starts never
duplicate it. The seed can also be run by hand (it is a no-op once any board exists):

```sh
uv run python -m app.seed
```

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/boards` | Create a board with the four default columns |
| GET | `/boards` | List boards |
| GET | `/boards/{board_id}` | Board view: columns in order, each with its ordered tickets |
| POST | `/boards/{board_id}/tickets` | Create a ticket at the bottom of the first column |
| GET | `/tickets/{key}` | Ticket details by key (`TKT-12`) |
| PATCH | `/tickets/{key}` | Edit title, description, type, priority or assignee |
| POST | `/tickets/{key}/move` | Move to another column or reorder within the current one |
| POST | `/tickets/{key}/comments` | Add a comment (`author`, `text`) |
| GET | `/tickets/{key}/comments` | Comments in chronological order |
| GET | `/tickets/{key}/history` | Creation entry plus one entry per column change |

Every error uses the same body: `{"error": {"code", "message", "details"}}`.

## Test and lint

```sh
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

Tests run against an isolated, unseeded database; `tests/test_seed.py` opts into the sample data.

## Configuration

| Variable | Default | Meaning |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///kanban.db` (in `backend/`) | SQLite database URL |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins (no wildcard) |
| `SEED_ON_STARTUP` | `true` | Set to `false` to skip seeding the sample board on startup |

## OpenAPI contract

The committed contract is generated from the app and guarded by `tests/test_contract.py`,
which fails whenever the two diverge. After any API change, refresh and commit it:

```sh
uv run python scripts/export_openapi.py   # writes specs/001-kanban-ticketing/contracts/openapi.json
uv run pytest tests/test_contract.py tests/test_docs.py
```
