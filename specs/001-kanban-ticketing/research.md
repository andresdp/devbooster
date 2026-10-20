# Research: Kanban Ticketing System

No `NEEDS CLARIFICATION` items remain; the stack was fixed by the user and the constitution. The entries below record the design decisions.

## Stack and tooling

- **Decision**: Python 3.12, FastAPI, SQLModel, Uvicorn; dev deps pytest, httpx, Ruff; managed with uv in `backend/pyproject.toml`.
- **Rationale**: Mandated by the constitution and user input. `httpx` is required by Starlette's `TestClient`. SQLModel gives one class for table + validation base while Pydantic v2 schemas stay separate for the API.
- **Alternatives**: SQLAlchemy only (more boilerplate); Alembic (rejected, see schema creation).

## Schema creation

- **Decision**: `SQLModel.metadata.create_all` at startup; no migration tool.
- **Rationale**: Constitution III only requires a fresh checkout to build the DB without manual steps. Simplicity (V) rejects Alembic for a single-feature schema.
- **Alternatives**: Alembic (extra dependency, YAGNI now; can be added when the schema first changes in production).

## Ticket keys

- **Decision**: Ticket table has an integer primary key with SQLite `AUTOINCREMENT` (`sqlite_autoincrement=True`); key is derived as `TKT-{id}` and exposed as `key`. Lookups parse `TKT-<n>` to the id.
- **Rationale**: AUTOINCREMENT guarantees ids are never reused even if rows are later deleted, and SQLite serializes writers so concurrent creates get distinct ids (FR-007, SC-002). No separate counter table needed.
- **Alternatives**: Stored key column + counter table (more state, more failure modes); MAX(id)+1 (reuses ids after deletes).

## Ordering within a column

- **Decision**: Integer `position` column, zero-based and gap-free. Move/reorder runs in one transaction: remove from source column (close gap), insert at target position (shift others), renumber affected columns.
- **Rationale**: Simple, deterministic, satisfies FR-012–FR-014. Column sizes are small, so renumbering cost is negligible. Same-column move is a reorder with range `0..n-1`; cross-column range is `0..n` (FR-012/013).
- **Alternatives**: Fractional/lexicographic ranks (not gap-free by definition, over-engineered); linked list (hard to query).

## Move API shape

- **Decision**: `POST /api/v1/tickets/{key}/move` with body `{column_id, position?}`. Same endpoint handles reorder (target = current column).
- **Rationale**: One action for both stories; history entry is written only when `column_id` changes (FR-017/018).
- **Alternatives**: `PATCH` ticket with column fields (mixes edit validation with move rules); separate reorder endpoint (duplicated logic).

## Error handling

- **Decision**: One body `{"error": {"code": str, "message": str, "details": [ ... ] | null}}`. Custom `NotFoundError` (404), `ConflictError` (409), `InvalidMoveError` (422) plus handlers overriding `RequestValidationError` (422), `HTTPException`, and a catch-all `Exception` handler (500, generic message). All documented in OpenAPI via `responses` and the shared `ErrorResponse` model.
- **Rationale**: Constitution VII; spec FR-021, SC-007. 422 is FastAPI's native status for body validation, so it is used for all invalid input including invalid move targets/positions; 409 is used only for duplicate board names.
- **Alternatives**: 400 for validation (conflicts with FastAPI default, would need remapping everywhere).

## Input normalization

- **Decision**: Pydantic `field_validator`/`StringConstraints(strip_whitespace=True, min_length=1)` on board name, ticket title, comment text and author; title max 200, description max 10,000. Enums `TicketType` (bug, feature, task) and `Priority` (low, medium, high, critical).
- **Rationale**: Matches clarifications (trim then reject empty) and assumptions. Case-insensitive board-name uniqueness checked in the service using `lower(name)` and backed by a unique index on a normalized `name_key` column to survive races.
- **Alternatives**: DB collation `NOCASE` unique (works but hides the rule from code and tests).

## CORS

- **Decision**: Starlette `CORSMiddleware` with origins from `CORS_ORIGINS` (comma-separated, default `http://localhost:5173`), methods and headers allowed explicitly for the API.
- **Rationale**: Constitution VI; no wildcard.

## Seed data

- **Decision**: `app/seed.py` creates one sample board ("Sample Project") with the default columns and ~8 tickets across columns, with a few comments and moves (via the same services so history is realistic). Runs on app startup only when no boards exist, and via `python -m app.seed`. Tests never seed unless `test_seed.py` does so explicitly.
- **Rationale**: Gives the future frontend data immediately; idempotent to keep restarts safe.
- **Alternatives**: SQL fixture file (bypasses service rules, drifts from them).

## OpenAPI contract sync

- **Decision**: `backend/scripts/export_openapi.py` writes `contracts/openapi.json` from `app.openapi()`; `tests/test_contract.py` regenerates in memory and compares with the committed file.
- **Rationale**: Constitution II requires a failing test on divergence.

## Testing isolation

- **Decision**: `conftest.py` builds a fresh SQLite engine per test (temp file or in-memory with `StaticPool`) and overrides the session dependency.
- **Rationale**: Constitution IV; no shared development data.
