# Kanban Backend

REST API for the kanban ticketing system (FastAPI + SQLModel + SQLite).

## Run

```sh
uv sync && uv run uvicorn app.main:app --reload
```

Interactive docs: http://localhost:8000/docs

## Test and lint

```sh
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

## Configuration

| Variable | Default | Meaning |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///kanban.db` (in `backend/`) | SQLite database URL |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins (no wildcard) |

## OpenAPI contract

```sh
uv run python scripts/export_openapi.py
```

Writes `specs/001-kanban-ticketing/contracts/openapi.json`.
