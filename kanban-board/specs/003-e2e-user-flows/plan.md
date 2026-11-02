# Implementation Plan: End-to-End User Flow Test Suite

**Branch**: `003-e2e-user-flows` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-e2e-user-flows/spec.md`

## Summary

Add a Playwright Test suite, written in JavaScript, as an independent project in `e2e/` at the
repo root. It checks the create, move (drag, detail view, reorder, history) and edit flows in a
real Chromium browser against the real frontend and backend. By default, `playwright.config.js`
starts the backend (uvicorn on port 8000, `cwd ../backend`, throwaway SQLite file) and the
frontend (Vite on port 5173, `cwd ../frontend`) through `webServer`. When `BASE_URL` is set, it
starts nothing and runs against that address, with `API_URL` naming the backend used for setup.
Checks run serially with no retries. Each check creates its own uniquely named board through the
API and does the step under test through the UI, using `getByRole`/`getByLabel` locators. It
confirms every outcome after a reload. Traces and screenshots are kept only for failing checks.
There is no CI workflow in this feature.

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js ≥ 20 (local: 22.23)

**Primary Dependencies**: `@playwright/test` ^1.64 (already in `e2e/package.json`); Chromium via `playwright install chromium`. No other runtime dependency (`@types/node` from the scaffold kept for editor hints only)

**Storage**: N/A for the suite. Managed mode gives the backend a throwaway SQLite file `<os tmpdir>/kanban-e2e-<runId>.db` via `DATABASE_URL`

**Testing**: Playwright Test (`npm test` in `e2e/`); existing Vitest (`frontend/`) and pytest (`backend/`) suites untouched

**Target Platform**: Desktop Chromium (Playwright `Desktop Chrome` device) on macOS/Linux developer machines; CI-compatible but no workflow yet

**Project Type**: End-to-end test project (third top-level project next to `backend/` and `frontend/`)

**Performance Goals**: Full local run, including app start-up, < 3 min (SC-001)

**Constraints**: No product changes (AS-011); `retries: 0` (FR-014); `workers: 1` (serial, user request); no fixed sleeps (FR-011); locators by role/label/text only (FR-012); never touch `backend/kanban.db` or data the suite did not create (FR-006, EC-003)

**Scale/Scope**: 3 spec files, 8 checks (US1 ×2, US2 ×4, US3 ×2), 5 small support modules, 1 global setup

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Python + FastAPI backend | ✅ N/A | `backend/` is not changed |
| II. OpenAPI contract is the source of truth | ✅ Pass | Setup helpers call only endpoints and bodies in `specs/001-kanban-ticketing/contracts/openapi.json`; the API is not changed. The rule against hand-written API types applies to `frontend/`. The plain-JS helpers declare no types, and all three of them are listed against the contract in `contracts/ui-locators.md` |
| III. SQLite persistence | ✅ Pass | Managed mode uses a separate SQLite file; no new store |
| IV. Test-first | ✅ Pass | Follows the `e2e/` bullet of Principle IV (constitution v1.2.0): each check is first seen to fail against a wrong column or title before the final assertion is written, and quickstart Scenario 5 shows a broken flow turning its check red; managed mode uses a throwaway database (EC-003); the suite stays outside Vitest/pytest (FR-013) |
| V. Simplicity | ✅ Pass with justification | One dependency (`@playwright/test`), justified in research R-01. No page-object framework, just five small support modules. No containers or hosted services; deployed targets are optional and user-supplied |
| VI. CORS for the local frontend | ✅ Pass | Managed mode sets `CORS_ORIGINS=http://localhost:5173` explicitly; no wildcard |
| VII. Consistent API errors | ✅ Pass | Setup helpers surface the uniform error body on failure |
| Repo constraints: monorepo `backend/` + `frontend/` | ⚠ Justified | Adds a third root directory `e2e/`; see Complexity Tracking |
| Repo constraints: English everywhere | ✅ Pass | Code, names, docs in English (AS-001) |
| Frontend constraint: TypeScript | ✅ N/A | Applies to `frontend/` only; `e2e/` is JavaScript by user request |

**Gate result**: PASS (one justified deviation).

**Post-design re-check** (after Phase 1): still PASS. One more deviation was found and justified.
Column locators rely on the `<section>` element because the column sections have no accessible
name (R-10). This is a test-design compromise confined to one helper, not a constitution
violation, and it is recorded as a follow-up: add `aria-labelledby` to `Column.tsx` in a future
frontend feature.

## Project Structure

### Documentation (this feature)

```text
specs/003-e2e-user-flows/
├── plan.md               # This file
├── research.md           # Phase 0: decisions R-01…R-14
├── data-model.md         # Phase 1: Run, Target, Check, Test Data
├── quickstart.md         # Phase 1: validation scenarios
├── contracts/
│   ├── run-interface.md  # Commands, env vars, modes, exit behaviour
│   └── ui-locators.md    # API endpoints and UI locators the suite relies on
├── checklists/
└── tasks.md              # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
e2e/                          # independent project (own package.json, lockfile, node_modules)
├── package.json              # "type": "module"; scripts: test, test:headed, report, install:browser
├── package-lock.json
├── .gitignore                # node_modules/, test-results/, playwright-report/, blob-report/
├── README.md                 # one command, BASE_URL/API_URL, evidence locations
├── playwright.config.js      # chromium only, workers 1, retries 0, trace/screenshot on failure,
│                             # webServer (backend + frontend) unless BASE_URL is set
├── global-setup.js           # reachability check of BASE_URL and API_URL (FR-008)
├── support/
│   ├── env.js                # runId, baseURL, apiURL, mode (single source for config + tests)
│   ├── names.js              # uniqueName(label) → "E2E <runId> <label>"
│   ├── api.js                # createBoard, createTicket, moveTicket (APIRequestContext)
│   ├── board.js              # column(page, name), cardsIn(column), dragCard(page, card, target)
│   └── fixtures.js           # test.extend({ api }) + re-exported expect; specs import from here
└── tests/
    ├── create-ticket.spec.js # US1
    ├── move-ticket.spec.js   # US2
    └── edit-ticket.spec.js   # US3

backend/    # unchanged
frontend/   # unchanged
README.md   # add a short "End-to-end tests" pointer to e2e/README.md
```

**Structure Decision**: The suite lives in its own `e2e/` project at the root (AS-009,
FR-013), next to the unchanged `backend/` and `frontend/`. The existing scaffold is reused and
changed: it switches to `"type": "module"`, drops the commented-out multi-browser config and
`retries: CI ? 2 : 0`, and gains `webServer`, `globalSetup` and the settings in research R-06.

### Key configuration (summary; details in research R-03…R-07)

| Setting | Value |
|---------|-------|
| `projects` | `[{ name: 'chromium', use: devices['Desktop Chrome'] }]` |
| `workers` / `fullyParallel` / `retries` | `1` / `false` / `0` |
| `use.baseURL` | `BASE_URL ?? 'http://localhost:5173'` |
| `use.trace` / `use.screenshot` / `use.video` | `'retain-on-failure'` / `'only-on-failure'` / `'off'` |
| `reporter` | `[['list'], ['html', { open: 'never' }]]` |
| `webServer` | `BASE_URL ? undefined : [backend, frontend]` with `reuseExistingServer: false` |
| `globalSetup` | `./global-setup.js` |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Third top-level project `e2e/` (constitution lists `backend/` + `frontend/`) | FR-013 needs the browser suite kept apart from the fast Vitest/pytest suites. It drives both apps and belongs to neither | `frontend/e2e/` would put Playwright into the frontend's install, lint and possibly Vitest discovery, and it would make the suite look frontend-only |
| New dev dependency `@playwright/test` (+ Chromium download) | Real-browser automation with auto-waiting, traces, screenshots and server management (FR-001, FR-007, FR-010, FR-011) | Hand-rolled Puppeteer/CDP scripts would need their own runner, waiting, reporting and server start-up |
| Column locator uses the `section` element (R-10) | Column sections have no accessible name, and AS-011 forbids product changes | `data-testid` violates FR-012; adding `aria-labelledby` is a product change, deferred as a follow-up |
