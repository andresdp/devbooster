# Implementation Plan: Kanban Ticketing System

**Branch**: `001-kanban-ticketing` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kanban-ticketing/spec.md`

## Summary

Deliver the backend REST API for a kanban ticketing system: boards with four fixed default columns, tickets with global `TKT-<n>` keys, move/reorder with gap-free zero-based positions, comments, and a status-change history. Implemented only in `backend/` as a FastAPI + Pydantic v2 app using SQLModel on SQLite, served under `/api/v1`, with CORS for `http://localhost:5173`, one uniform error body, and seed data containing a sample board. The committed OpenAPI contract is exported from the app and guarded by a sync test.

## Technical Context

**Language/Version**: Python 3.12

**Primary Dependencies**: FastAPI, Pydantic v2 (via FastAPI), SQLModel, Uvicorn. Dev: pytest, httpx (required by Starlette `TestClient`), Ruff. All justified in [research.md](./research.md).

**Storage**: SQLite file (path from `DATABASE_URL`, default `backend/kanban.db`); tables created from SQLModel metadata at startup

**Testing**: pytest with `fastapi.testclient.TestClient`, isolated in-memory/temp SQLite per test

**Target Platform**: Local development (macOS/Linux), single process

**Project Type**: web-service (backend only; `frontend/` untouched, no Node dependencies)

**Performance Goals**: Board with 200 tickets served in < 2 s (SC-003); in practice a single query set, well under that

**Constraints**: No auth, no external infrastructure, errors use one JSON body, no stack-trace leakage, CORS origins explicit and configurable

**Scale/Scope**: One trusted team, thousands of tickets; 5 entities, ~10 endpoints

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. Python + FastAPI + Pydantic v2 | PASS | FastAPI app, Pydantic v2 schemas in `app/schemas`, `/docs` auto-generated |
| II. OpenAPI is source of truth | PASS | `contracts/openapi.json` exported by `backend/scripts/export_openapi.py`; `tests/test_contract.py` fails on divergence |
| III. SQLite persistence | PASS | SQLite only; schema built by `SQLModel.metadata.create_all` so a fresh checkout needs no manual steps |
| IV. Test-first pytest | PASS | Tasks order tests before implementation per story; each endpoint has success and error tests; fixtures use an isolated DB |
| V. Simplicity | PASS | No migrations tool, no repository layer, no auth; services are plain functions; 3 runtime deps |
| VI. CORS | PASS | `CORS_ORIGINS` env (comma-separated), default `http://localhost:5173`, no wildcard |
| VII. Consistent errors | PASS | Single `ErrorResponse` body for 404/409/422/500, handlers registered once in `app/errors.py` |

No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-kanban-ticketing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md           # Endpoint and error-body reference
│   └── openapi.json     # Generated at implementation time, kept in sync by test
└── tasks.md             # Created by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── pyproject.toml          # uv-managed, own project; ruff + pytest config
├── uv.lock
├── README.md               # Single run command and test/lint commands
├── app/
│   ├── main.py             # App factory, CORS, router mounting, startup (create tables, seed)
│   ├── config.py           # Settings: DATABASE_URL, CORS_ORIGINS
│   ├── db.py               # Engine, session dependency, create_all
│   ├── errors.py           # ErrorResponse, AppError subclasses, exception handlers
│   ├── seed.py             # Idempotent sample board; also `python -m app.seed`
│   ├── models/             # SQLModel tables: board, column, ticket, comment, history
│   ├── schemas/            # Pydantic v2 request/response models
│   ├── services/           # boards, tickets (create/edit/move), comments, history
│   └── routers/            # boards, tickets, comments/history; all under /api/v1
├── scripts/
│   └── export_openapi.py   # Writes specs/001-kanban-ticketing/contracts/openapi.json
└── tests/
    ├── conftest.py         # Isolated DB + TestClient fixtures
    ├── test_boards.py
    ├── test_tickets.py
    ├── test_move_reorder.py
    ├── test_comments_history.py
    ├── test_errors.py
    ├── test_seed.py
    ├── test_cors.py
    └── test_contract.py

frontend/                   # Not touched by this feature
```

**Structure Decision**: Backend-only layout from the constitution's monorepo rule, with `backend/` as its own uv project. Routers hold HTTP concerns, services hold business rules (positioning, key assignment, history), models/schemas are separated so DB shape and API shape can differ.

## Complexity Tracking

No violations to justify.
