# Data Model: End-to-End User Flow Test Suite

**Feature**: `003-e2e-user-flows` | **Date**: 2026-11-01 | **Plan**: [plan.md](./plan.md)

This feature stores nothing of its own. The entities below are the concepts the suite works with
at run time; the product's own entities (Board, Column, Ticket, History) are defined in
[`specs/001-kanban-ticketing/data-model.md`](../001-kanban-ticketing/data-model.md) and are only
used through the API and the web app.

## Run

One execution of `playwright test`.

| Field | Source | Rules |
|-------|--------|-------|
| `runId` | `E2E_RUN_ID` env, else generated in `playwright.config.js` | Format `YYYYMMDDTHHMMSS-xxxx` (UTC + 4 hex); identical in the main process and every worker |
| `mode` | derived | `managed` when `BASE_URL` is unset, else `external` |
| `target` | → Target | Fixed for the whole run |
| `results` | Playwright reporter | One result per Check; no retries (FR-014) |

## Target

| Field | Source | Default | Rules |
|-------|--------|---------|-------|
| `baseURL` (frontend) | `BASE_URL` | `http://localhost:5173` | Absolute `http(s)` URL, no trailing slash |
| `apiURL` (backend) | `API_URL` | `http://localhost:8000` in managed mode; required when `BASE_URL` is set; must be unset when `BASE_URL` is unset | Absolute `http(s)` URL without `/api/v1`; the suite appends the prefix |
| `databaseURL` | managed mode only | `sqlite:///<os tmpdir>/kanban-e2e-<runId>.db` | Never the developer's `backend/kanban.db` (EC-003) |

**State**: `managed` → servers started by `webServer` → reachability check → checks → servers
stopped. `external` → reachability check → checks. An unreachable address stops the run before
any check (FR-008).

## Check

One test in `e2e/tests/*.spec.js`.

| Field | Rules |
|-------|-------|
| `name` | `<story> <scenario>` in plain English, e.g. `create › shows the new ticket in To Do after reload` |
| `board` | Exactly one Test Data board created in setup; locators never leave that board's page |
| `steps` | Wrapped in `test.step()` with user-facing names so the failing step is reported (FR-010) |
| `evidence` | On failure only: `test-results/<check>/trace.zip` and `test-failed-*.png` |

Coverage (FR-002):

| Spec file | Checks |
|-----------|--------|
| `create-ticket.spec.js` | US1 AS-1 create + reload; US1 AS-2 missing title |
| `move-ticket.spec.js` | US2 AS-1 drag across columns; AS-2 move from detail view; AS-3 history; AS-4 reorder within column |
| `edit-ticket.spec.js` | US3 AS-1 edit all fields; AS-2 empty title rejected |

US4 is covered by the configuration itself (managed vs external mode, reachability, evidence)
and validated through [quickstart.md](./quickstart.md).

## Test Data

Created only through the API (setup) or the web app (step under test); never deleted (EC-007).

| Kind | Name | Created by |
|------|------|------------|
| Board | `E2E <runId> <check label>` | Setup (`POST /api/v1/boards`) |
| Ticket (setup) | `E2E <runId> <label>` | Setup (`POST /api/v1/boards/{id}/tickets`, optionally `POST /api/v1/tickets/{key}/move`) |
| Ticket (under test) | `E2E <runId> <label>` | The web app (US1 only) |

**Validation rules**: board names ≤ 100 chars and titles ≤ 200 chars (backend limits); the
`E2E ` prefix is reserved for suite data; ticket keys (`TKT-<n>`) are read from API responses
or the card, never assumed.
