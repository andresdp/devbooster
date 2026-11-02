# Quickstart: Validating the E2E Suite

**Feature**: `003-e2e-user-flows` | **Plan**: [plan.md](./plan.md)

Run interface: [contracts/run-interface.md](./contracts/run-interface.md). Locators and API
helpers: [contracts/ui-locators.md](./contracts/ui-locators.md).

## Prerequisites (once)

```sh
(cd backend && uv sync)
(cd frontend && npm ci)
(cd e2e && npm ci && npm run install:browser)
```

Nothing should be listening on ports 8000 or 5173.

## Scenario 1 — Default local run (US4 AS-1, SC-001)

```sh
cd e2e && npm test
```

Expected: backend and frontend start, every check in `create-ticket`, `move-ticket` and
`edit-ticket` passes, both servers stop, total time under 3 minutes. `backend/kanban.db` is
unchanged (compare its modification time before and after).

## Scenario 2 — Against an already-running app (US4 AS-2, SC-002, EC-003)

```sh
(cd backend && uv run uvicorn app.main:app --port 8000)   # terminal 1
(cd frontend && npm run dev)                              # terminal 2
cd e2e && BASE_URL=http://localhost:5173 API_URL=http://localhost:8000 npm test   # terminal 3
```

Expected: nothing new is started; checks pass; the app now contains new boards named
`E2E <runId> …` and every other board is untouched (SC-006: compare `GET /api/v1/boards`
before and after; only `E2E` boards were added).

For a deployed test environment: `BASE_URL=https://web.test.example API_URL=https://api.test.example npm test`.

## Scenario 3 — Unreachable target (US4 AS-3, FR-008)

```sh
cd e2e && BASE_URL=http://localhost:5999 API_URL=http://localhost:8999 npm test
```

Expected: fails within seconds, before any check, with one line per address:
`E2E target unreachable: http://localhost:5999 (…)` and
`E2E target unreachable: http://localhost:8999/api/v1/boards (…)`.
Setting `BASE_URL` without `API_URL` stops immediately with
`API_URL is required when BASE_URL is set …`; setting `API_URL` without `BASE_URL` stops
immediately with `API_URL is set but BASE_URL is not …`, before anything is started.

## Scenario 4 — Port already taken in default mode (EC-003)

With the backend from Scenario 2 still running: `cd e2e && npm test`.

Expected: the run stops because port 8000 is in use; no test board is written to the
developer's database.

## Scenario 5 — Failure evidence (US4 AS-4, FR-010, SC-004, SC-005)

Temporarily break one flow at a time in `backend/app/routers/tickets.py`, run `npm test`, then
revert: (a) `POST /tickets/{key}/move` returns an error → only the move checks fail;
(b) `PATCH /tickets/{key}` returns an error → only the edit checks fail.

Expected: only the checks for the broken flow fail; the output names the failing step and points to
`test-results/<check>/trace.zip` and a screenshot; `npm run report` opens the HTML report and
the trace shows the failing step. The other checks still pass.

## Scenario 6 — Stability (SC-003)

```sh
cd e2e && for i in $(seq 10); do npm test || break; done
```

Expected: 10 consecutive green runs; no check is ever retried (`retries: 0`).

## Scenario 7 — Isolation from other suites (FR-013)

```sh
(cd frontend && npm test) && (cd backend && uv run pytest)
```

Expected: both pass without Playwright installed in their projects and without a running app.
