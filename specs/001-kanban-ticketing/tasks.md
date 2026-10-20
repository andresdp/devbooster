---

description: "Task list for the Kanban Ticketing System backend"
---

# Tasks: Kanban Ticketing System

**Input**: Design documents from `/specs/001-kanban-ticketing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: REQUIRED. Constitution principle IV (Test-First, NON-NEGOTIABLE): within each story, write the tests first, run them, and confirm they FAIL before implementing. Every endpoint needs success and error-path tests, all against an isolated database.

**Organization**: Tasks are grouped by user story (US1 = P1, US2 = P2, US3 = P3) so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2 or US3 (user story phases only)

## Path Conventions

Backend-only feature. All code lives under `backend/` (own uv project), all paths below are relative to the repository root. `frontend/` is not touched. All code, comments, docs and commit messages are in English.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and structure

- [ ] T001 Create the directory skeleton from plan.md: `backend/app/{models,schemas,services,routers}/` (each with an `__init__.py`), `backend/app/__init__.py`, `backend/scripts/`, `backend/tests/`
- [ ] T002 Create `backend/pyproject.toml` (uv-managed, Python 3.12) with runtime deps `fastapi`, `sqlmodel`, `uvicorn` and dev deps `pytest`, `httpx`, `ruff`; configure `[tool.pytest.ini_options]` (`testpaths = ["tests"]`) and `[tool.ruff]` (line length 100, lint rules `E,F,I,B,UP`); run `uv sync` inside `backend/` to produce `backend/uv.lock`
- [ ] T003 [P] Create `backend/README.md` with the single run command (`uv sync && uv run uvicorn app.main:app --reload`), the test command (`uv run pytest`), lint commands (`uv run ruff check . && uv run ruff format --check .`), the `DATABASE_URL` / `CORS_ORIGINS` env vars and the OpenAPI export command
- [ ] T004 [P] Add `backend/.gitignore` ignoring `.venv/`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `kanban.db*`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Test-first order (constitution IV)**: T011 and T012 are written and confirmed FAILING before the code they cover (T006, T009) is implemented. `conftest.py` (T010) is test support, not covered code.

- [ ] T011 [P] Write `backend/tests/test_errors.py` (written and run Red BEFORE T006/T009; it fails because `app.errors`/`app.main` do not exist yet): the uniform body shape for 404, 409, 422 `validation_error` (with `details` naming the field) and 422 `invalid_move`; invalid JSON body and unknown fields → 422 `validation_error`; unsupported method (e.g. `DELETE /api/v1/boards/1`) → 405 `http_error` in the same body; an unexpected exception (register a throwaway route raising `RuntimeError("secret db detail")` on a test app) → 500 `internal_error` with generic message and no traceback or the secret text in the body
- [ ] T012 [P] Write `backend/tests/test_cors.py` (written and run Red BEFORE T009; it fails because `app.main` does not exist yet): a request with `Origin: http://localhost:5173` gets `Access-Control-Allow-Origin: http://localhost:5173`; a preflight `OPTIONS` from that origin succeeds; `Origin: http://evil.example` gets no allow-origin header; `CORS_ORIGINS` override with two origins allows both
- [ ] T005 [P] Implement `backend/app/config.py`: settings read from env, `DATABASE_URL` (default `sqlite:///backend/kanban.db` resolved so it works from `backend/` too) and `CORS_ORIGINS` (comma-separated, default `http://localhost:5173`, no wildcard)
- [ ] T006 [P] Implement `backend/app/errors.py`: `ErrorResponse` Pydantic model `{error: {code, message, details: [{field, message}] | null}}`; `AppError` base plus `NotFoundError` (404 `not_found`), `ConflictError` (409 `conflict`), `InvalidMoveError` (422 `invalid_move`); `register_exception_handlers(app)` overriding `RequestValidationError` (422 `validation_error`, `details` = one `{field, message}` per error, including invalid-JSON bodies), Starlette `HTTPException` (`http_error`, status preserved, e.g. 405) and a catch-all `Exception` handler (500 `internal_error`, generic message, no stack trace or DB text); export a `ERROR_RESPONSES` dict for use in router `responses=`
- [ ] T007 [P] Implement SQLModel table models in `backend/app/models/` exactly per data-model.md: `board.py` (`Board`: `name` max 100, unique `name_key`, `created_at`), `column.py` (`Column`: `board_id`, `name`, `position`, unique `(board_id, position)`), `ticket.py` (`Ticket`: integer PK with `sqlite_autoincrement=True`, `board_id`, `column_id`, `position`, `title` 1–200, `description` 0–10,000 default "", `type` enum bug|feature|task default task, `priority` enum low|medium|high|critical default medium, `assignee` str|null max 100, `created_at`, `updated_at`; index `(column_id, position)`; no stored key), `comment.py` (`Comment`: `ticket_id`, `author` max 100, `text` max 5,000, `created_at`), `history.py` (`HistoryEntry`: `ticket_id`, `from_column_id` nullable, `to_column_id`, `changed_at`); export `TicketType` and `Priority` enums from `ticket.py`; all datetimes UTC with sub-second precision; re-export all in `backend/app/models/__init__.py`
- [ ] T008 Implement `backend/app/db.py` (depends on T005, T007): engine factory with `check_same_thread=False`, `PRAGMA foreign_keys=ON`, `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=FULL` (FR-020 durability) per connection, a `begin immediate` write-transaction helper so concurrent create/move are serialized (EC-002, EC-012), `create_db_and_tables(engine)` using `SQLModel.metadata.create_all`, and a `get_session` FastAPI dependency
- [ ] T009 Implement `backend/app/main.py` (depends on T005, T006, T008): `create_app()` factory with title/version, `CORSMiddleware` (origins from settings, explicit methods `GET,POST,PATCH,OPTIONS` and headers `Content-Type`, no wildcard), `register_exception_handlers`, a lifespan that calls `create_db_and_tables` (seeding is hooked in T040), an `/api/v1` `APIRouter` onto which US routers are mounted later, and module-level `app = create_app()`
- [ ] T010 [P] Implement `backend/tests/conftest.py` (depends on T008, T009): per-test isolated SQLite engine (temp file or in-memory with `StaticPool`), `get_session` dependency override, `client` fixture (`TestClient` against `create_app()` with an empty database, no seed), and helper factories `make_board(client, name)` and `make_ticket(client, board_id, **fields)` returning the response JSON
- [ ] T013 [P] Implement `backend/scripts/export_openapi.py`: build the app via `create_app()` and write `app.openapi()` as sorted, indented JSON to `specs/001-kanban-ticketing/contracts/openapi.json` (path resolved relative to the script)

**Checkpoint**: Foundation ready (T011/T012 were seen failing first and pass now after T006/T009/T010; the rest of the suite is Red until stories are implemented)

---

## Phase 3: User Story 1 - Create boards and tickets, view them by column (Priority: P1) 🎯 MVP

**Goal**: Create boards (4 default columns) and tickets (global `TKT-n` keys), list/get boards, view a board grouped by column, get and edit a ticket.

**Independent Test**: Create a board, create several tickets with different types/priorities, `GET` the board and confirm every ticket is under To Do with its key and details; get and edit a ticket by key; restart the app on the same database file and confirm data persists.

### Tests for User Story 1 (write first, confirm they FAIL) ⚠️

- [ ] T014 [P] [US1] Write `backend/tests/test_boards.py`: create board → 201 with 4 columns `To Do, In Progress, Review, Done` at positions 0–3 and no tickets; trim whitespace; empty/whitespace-only name → 422; name of 101 chars → 422 (100 accepted); duplicate name incl. different case and Unicode case folding (e.g. `Straße` vs `STRASSE`) → 409 `conflict`; `GET /boards` lists all (summary shape `{id, name, created_at}`); `GET /boards/{id}` returns `BoardDetail` with columns in order; empty board shows all columns with empty ticket lists (EC-010); unknown board → 404; non-integer `board_id` → 422; wrong JSON types and unknown fields → 422
- [ ] T015 [P] [US1] Write `backend/tests/test_tickets.py`: create with only `title` → 201 with defaults (`task`, `medium`, `description` "", `assignee` null), first column, position 0, key `TKT-1`; second ticket gets `TKT-2` and position 1; keys are global across two boards; title/description/assignee trimming and length limits (200/10,000/100 accepted, +1 rejected, counted in code points e.g. emoji); whitespace-only title → 422; missing title, `type: "epic"`, bad priority, null `type`/`priority`/`description`, numeric title → 422 and nothing created; blank or null assignee → null; unknown board → 404; board view groups tickets by column with full ticket fields and positions (US1 scenario 4); `GET /tickets/TKT-1` returns full details with no comments/history embedded; unknown well-formed key → 404; malformed keys `tkt-1`, `TKT-0`, `TKT-012`, `TKT-` , `abc` → 422; huge numeric key (e.g. `TKT-99999999999999999999`) → 404 not a crash; `PATCH` edits each field, omitted fields unchanged, `description: ""` empties, `assignee: null` and `"  "` clear, empty title → 422, empty body → 422, board/column/position fields rejected as unknown, key/board/column/position unchanged after edit, invalid values leave ticket unchanged and `updated_at` changes only on successful edit
- [ ] T016 [P] [US1] Write `backend/tests/test_key_concurrency.py`: 20+ concurrent ticket creations (threads sharing the app) all succeed with distinct keys (SC-002), 1,000 sequential creations produce unique increasing keys, and a ticket creation forced to fail mid-way (monkeypatch the history write to raise) leaves no ticket or history row (FR-007 atomicity)
- [ ] T017 [P] [US1] Write `backend/tests/test_persistence.py`: build the app on a temp-file database, create a board and tickets, dispose the engine and build a fresh app on the same file, and assert boards, tickets, positions, comments and history are identical (US1 scenario 9, FR-020); also assert `create_db_and_tables` is idempotent
- [ ] T018 [P] [US1] Write `backend/tests/test_board_view_perf.py`: a board with 200 tickets is served by `GET /boards/{id}` in under 2 seconds (SC-003) and the request issues a bounded number of queries (not one per ticket)

### Implementation for User Story 1

- [ ] T019 [P] [US1] Implement request/response schemas in `backend/app/schemas/board.py` and `backend/app/schemas/ticket.py` (Pydantic v2, `model_config = ConfigDict(extra="forbid", strict=True)`): `BoardCreate` (`name` stripped, 1–100), `BoardSummary`, `BoardCreated` (adds `columns: [{id,name,position}]`), `ColumnWithTickets`, `BoardDetail`; `TicketCreate` (`title` stripped 1–200, `description` stripped 0–10,000 default "", `type`, `priority`, `assignee` stripped ≤100 with blank→None), `TicketUpdate` (all optional, at least one field required via model validator, `title` may not be null/empty, `description`/`type`/`priority` do not accept null), `TicketRead` (`key` computed as `TKT-{id}`, `board_id`, `column_id`, `position`, timestamps with explicit UTC offset); a shared `TicketKey` annotated type with pattern `^TKT-[1-9][0-9]*$`; re-export in `backend/app/schemas/__init__.py`. Keep strictness compatible with JSON enums (strict mode must still accept the enum string values)
- [ ] T020 [US1] Implement `backend/app/services/boards.py` (depends on T007, T019): `create_board` (trim, compute `name_key = name.casefold()`, insert board and its 4 default columns in one transaction, map unique-constraint violation to `ConflictError`), `list_boards`, `get_board` (404 via `NotFoundError`), `get_board_detail` (load columns ordered by position and all their tickets ordered by position using a fixed number of queries)
- [ ] T021 [US1] Implement `backend/app/services/tickets.py` (depends on T007, T019): `parse_key` (`TKT-<n>` → id; ids beyond SQLite's 64-bit range are treated as not found), `get_ticket_or_404`, `create_ticket` (inside one `begin immediate` transaction: verify board, place at `position = count(first column)`, insert the ticket and `HistoryEntry(from=None, to=first column)` together, roll back both on any failure), and `update_ticket` (apply only supplied fields, never touch board/column/position, bump `updated_at` only on a successful edit)
- [ ] T022 [US1] Implement `backend/app/routers/boards.py`: `POST /boards` (201), `GET /boards`, `GET /boards/{board_id}`, `POST /boards/{board_id}/tickets` (201); declare `response_model` and `responses=ERROR_RESPONSES` on every route so the error body appears in OpenAPI (depends on T020, T021)
- [ ] T023 [US1] Implement `backend/app/routers/tickets.py`: `GET /tickets/{key}` and `PATCH /tickets/{key}` using the `TicketKey` path type; mount both routers on the `/api/v1` router in `backend/app/main.py` (depends on T021, T022)
- [ ] T024 [US1] Run `uv run pytest tests/test_boards.py tests/test_tickets.py tests/test_key_concurrency.py tests/test_persistence.py tests/test_board_view_perf.py tests/test_errors.py tests/test_cors.py` from `backend/` until all pass; fix any issue found in the code, not by weakening tests

**Checkpoint**: US1 is fully functional and testable on its own — this is the MVP

---

## Phase 4: User Story 2 - Move and reorder tickets (Priority: P2)

**Goal**: Move a ticket to another column of its board at an optional position, and reorder within a column; positions stay zero-based and gap-free.

**Independent Test**: With a board of several tickets, move a ticket to another column, reorder within a column, reload the board and confirm column and order persist with positions `0..n-1`.

### Tests for User Story 2 (write first, confirm they FAIL) ⚠️

- [ ] T025 [P] [US2] Write `backend/tests/test_move_reorder.py` (example-based): move To Do → In Progress (default bottom; gone from source, source closes up); move with position 0 / middle / `n` (append) inserts and shifts with relative order kept; reorder third ticket to the top; reorder with no position → last position; reorder to current position → 200 no-op with `updated_at` unchanged and no history entry (EC-004); single-ticket column accepts only position 0 (EC-005); empty target column accepts position 0 or none; invalid cases → 422 `invalid_move` with state unchanged: column of another board, unknown column id, cross-column position `n+1`, reorder position `n`; malformed input → 422 `validation_error`: negative, float, string `"1"`, null `column_id`, missing `column_id`, unknown field; unknown well-formed key → 404; malformed key → 422; cross-column move bumps `updated_at`; order persists on reload of the board (US2 scenario 5)
- [ ] T026 [P] [US2] Write `backend/tests/test_move_property.py` (SC-004): at least 100 seeded-random sequences of valid and invalid moves/reorders across several columns and boards, compared after every step against a simple in-memory list-of-lists model; after each operation assert every column's positions are exactly `0..n-1` and the board view matches the model
- [ ] T027 [P] [US2] Write `backend/tests/test_move_concurrency.py` (EC-012): concurrent moves/reorders on the same column (threads) each return either success or a clean 422, and afterwards every column is gap-free with no duplicate positions and no ticket lost; a move forced to fail after the position shuffle (monkeypatch the history write) leaves positions and history untouched (FR-015 atomicity)

### Implementation for User Story 2

- [ ] T028 [P] [US2] Add `TicketMove` (`column_id: int` strict, `position: int | None` strict, `ge=0`, `extra="forbid"`) to `backend/app/schemas/ticket.py`
- [ ] T029 [US2] Implement `move_ticket` in `backend/app/services/tickets.py` (depends on T021, T028): one `begin immediate` transaction; load ticket; verify target column exists and belongs to the ticket's board else `InvalidMoveError`; same column → reorder with valid range `0..n-1` (default `n-1`), same position → return without changes; different column → valid range `0..n` (default `n`), close the gap in the source, shift the target, set the new column/position, bump `updated_at`, and write `HistoryEntry(from, to)`; keep both columns gap-free; any failure rolls back everything
- [ ] T030 [US2] Add `POST /tickets/{key}/move` (200 `TicketRead`, documented 404/422 responses) to `backend/app/routers/tickets.py` (depends on T029)
- [ ] T031 [US2] Run `uv run pytest tests/test_move_reorder.py tests/test_move_property.py tests/test_move_concurrency.py` plus the US1 suite from `backend/` until everything passes

**Checkpoint**: US1 and US2 both work independently

---

## Phase 5: User Story 3 - Comments and status-change history (Priority: P3)

**Goal**: Add and list comments on a ticket; view a ticket's chronological history (creation entry plus one entry per column change, none for reorders).

**Independent Test**: Add comments to a ticket, move it across several columns, then list comments and history and confirm chronological order and exact entry counts.

### Tests for User Story 3 (write first, confirm they FAIL) ⚠️

- [ ] T032 [P] [US3] Write `backend/tests/test_comments_history.py`: add comment → 201 with `{id, ticket_key, author, text, created_at}`; list is chronological and same-timestamp comments order by id; author/text trimmed, empty or whitespace-only → 422, author 101 / text 5,001 chars → 422 (100 / 5,000 accepted); wrong types and unknown fields → 422; comments on unknown well-formed key → 404 for both POST and GET; malformed key → 422; new ticket history has exactly one entry (`from_column` null, `to_column` To Do); create + move to In Progress + move to Review → three entries in chronological order with from/to column `{id, name}`; a same-column reorder adds no entry; a no-op move adds no entry; history of unknown key → 404; comments from one ticket never appear on another

### Implementation for User Story 3

- [ ] T033 [P] [US3] Implement `backend/app/schemas/comment.py` (`CommentCreate` with `extra="forbid"`, stripped `author` 1–100 and `text` 1–5,000; `CommentRead`) and `backend/app/schemas/history.py` (`ColumnRef {id, name}`, `HistoryEntryRead {id, ticket_key, from_column: ColumnRef | None, to_column: ColumnRef, changed_at}`); re-export in `backend/app/schemas/__init__.py`
- [ ] T034 [US3] Implement `backend/app/services/comments.py` (`add_comment`, `list_comments` ordered by `created_at, id`; both 404 for missing tickets) and `backend/app/services/history.py` (`list_history` ordered by `changed_at, id`, joining column names; 404 for missing tickets) (depends on T021, T033)
- [ ] T035 [US3] Implement `backend/app/routers/comments.py` with `POST /tickets/{key}/comments` (201), `GET /tickets/{key}/comments`, `GET /tickets/{key}/history`, all with `responses=ERROR_RESPONSES`; mount it on the `/api/v1` router in `backend/app/main.py` (depends on T034)
- [ ] T036 [US3] Run the full suite `uv run pytest` from `backend/` and confirm US1–US3 are all green

**Checkpoint**: All three user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Seed data, contract sync, and final quality gates

- [ ] T037 [P] Write `backend/tests/test_seed.py` (Red first): seeding an empty database creates exactly one board ("Sample Project") with ~8 tickets across columns, several comments and realistic history (created through the services); running seed twice does not duplicate; app startup on an empty database seeds, startup when any board exists does not; the default `client` fixture from `conftest.py` stays unseeded (FR-024)
- [ ] T038 [P] Write `backend/tests/test_contract.py` (Red first): regenerate `create_app().openapi()` in memory and assert it equals the committed `specs/001-kanban-ticketing/contracts/openapi.json` (sorted-key JSON comparison); assert every operation documents the `ErrorResponse` body for its error statuses (constitution II and VII)
- [ ] T039 [P] Write a docs test in `backend/tests/test_docs.py`: `GET /docs` returns 200 and `GET /openapi.json` lists all ten operations from contracts/api.md under `/api/v1`
- [ ] T040 Implement `backend/app/seed.py` (depends on T020, T021; uses `create_board`, `create_ticket`, `move_ticket`, `add_comment` so rules and history are honored): `seed_if_empty(session)` that is a no-op when any board exists, and `python -m app.seed` entry point; call it from the lifespan in `backend/app/main.py` after `create_db_and_tables`
- [ ] T041 Generate the contract: run `uv run python scripts/export_openapi.py` from `backend/` and commit `specs/001-kanban-ticketing/contracts/openapi.json`; then run `uv run pytest tests/test_contract.py tests/test_docs.py`
- [ ] T042 [P] Code cleanup pass in `backend/app/`: remove duplication between services and routers, make sure no HTTP concerns are in `services/` and no business rules are in `routers/`, and run `uv run ruff check . && uv run ruff format .` until clean
- [ ] T043 [P] Update `backend/README.md` to match the final behavior (seed on first start, `python -m app.seed`, how to refresh the OpenAPI contract, env vars)
- [ ] T044 Walk through every scenario in `specs/001-kanban-ticketing/quickstart.md` against `uv run uvicorn app.main:app` (docs + seed, create, fetch/edit, move/reorder, comments/history, CORS header, error body, restart persistence, 500 with no stack trace) and fix any discrepancy
- [ ] T045 Final gate from `backend/`: `uv run pytest` all green, `uv run ruff check . && uv run ruff format --check .` clean, `git diff specs/001-kanban-ticketing/contracts/openapi.json` empty after re-export

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational; no dependency on other stories
- **US2 (Phase 4)**: depends on Foundational and on US1's ticket creation/service (it moves tickets that US1 creates and extends `services/tickets.py` and `routers/tickets.py`)
- **US3 (Phase 5)**: depends on Foundational and US1 (ticket lookup, creation history entry); the history cases that involve moves need US2's `move_ticket`
- **Polish (Phase 6)**: depends on all stories (seed uses every service; contract test needs the final API)

### Task-level Dependencies

- T011, T012 are written first and must FAIL before T006/T009 are implemented (T006, T009 ← T011/T012 Red run)
- T008 ← T005, T007; T009 ← T005, T006, T008; T010 ← T008, T009
- T020, T021 ← T007, T019; T022 ← T020, T021; T023 ← T021, T022
- T029 ← T021, T028; T030 ← T029
- T034 ← T021, T033; T035 ← T034
- T040 ← T020, T021, T029, T034; T041 ← T040 and all routers

### Within Each User Story

- Tests are written and seen failing before implementation (constitution IV)
- Schemas → services → routers → run the story's suite
- A story is done only when its tests pass, the error paths are covered and the uniform error body is used

### Parallel Opportunities

- Setup: T003, T004 in parallel
- Foundational: T011, T012 first (Red); then T005, T006, T007 in parallel; then T010, T013 in parallel once T008/T009 exist
- US1 tests T014–T018 are all different files and run in parallel; T019 can run alongside them
- US2 tests T025–T027 in parallel; US3 tests T032 and schemas T033 in parallel
- Polish: T037, T038, T039, T042, T043 in parallel
- Files shared between stories (`services/tickets.py`, `routers/tickets.py`, `schemas/ticket.py`, `main.py`) make US1/US2 tasks that edit them sequential, so US2 and US3 are best staffed after US1

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests together (different files):
Task: "Write backend/tests/test_boards.py"
Task: "Write backend/tests/test_tickets.py"
Task: "Write backend/tests/test_key_concurrency.py"
Task: "Write backend/tests/test_persistence.py"
Task: "Write backend/tests/test_board_view_perf.py"

# Meanwhile, define the schemas:
Task: "Implement backend/app/schemas/board.py and backend/app/schemas/ticket.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (blocks everything)
3. Phase 3: US1 (boards, tickets, board view, keys, persistence)
4. **STOP and VALIDATE**: run the US1 suite and quickstart scenarios 1–3
5. Demo: a usable API for recording and viewing work

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test independently → MVP
3. US2 → test independently → core kanban behavior
4. US3 → test independently → collaboration and traceability
5. Polish → seed data, synced OpenAPI contract, final gates

---

## Notes

- [P] tasks touch different files and have no dependency on unfinished tasks
- The creation history entry is written by US1's `create_ticket` (FR-017) but is only exposed and verified through US3's history endpoint
- The generated `openapi.json` is committed and guarded by `test_contract.py`; refresh it whenever the API changes
- Commit after each task or logical group
