---

description: "Task list for the End-to-End User Flow Test Suite"
---

# Tasks: End-to-End User Flow Test Suite

**Input**: Design documents from `/specs/003-e2e-user-flows/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/run-interface.md, contracts/ui-locators.md, quickstart.md

**Tests**: This feature *is* a test suite. The checks in `e2e/tests/*.spec.js` are the deliverable, so they appear as implementation tasks. Per Constitution IV (as interpreted in plan.md), each check is first seen to fail (assert the wrong column or title) before the final assertion is written.

**Organization**: Tasks are grouped by user story. US4 (run locally or against a deployed target, P1) is mostly the run configuration and is foundational for the other stories, so its blocking parts sit in Phase 2 and its validation and docs have their own phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

## Path Conventions

- Suite lives in `e2e/` at the repo root (independent project). `backend/` and `frontend/` MUST NOT be changed (AS-011).
- All code is plain JavaScript ES modules; all names, comments and docs in English (AS-001).

## Global rules for every task (from spec/plan; do not re-decide)

- No fixed delays: never use `page.waitForTimeout`; only web-first assertions (`expect(locator).toBeVisible()`, `toHaveText`, `toHaveCount`) and auto-waiting actions (FR-011, R-12).
- Locators by role, label and visible text only (FR-012). The single exception is the column `section` locator inside `e2e/support/board.js` (R-10). No `data-testid`, no CSS classes.
- Setup data (boards, starting tickets, starting moves) goes through `e2e/support/api.js` only; the step under test and every outcome assertion go through the UI (FR-004, FR-012).
- Every check creates exactly one board, and every ticket it creates (through the API or the UI) gets a title from `uniqueName(...)`; it never navigates away from that board's page (FR-005, EC-001, EC-002).
- Every outcome is asserted again after `page.reload()` (FR-003, EC-005).
- Wrap user-facing steps in `test.step('<plain English>', ...)` so the failing step is reported (FR-010).
- Never delete, reset or modify data the suite did not create (FR-006).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Turn the existing `e2e/` scaffold into the project described in plan.md.

- [X] T001 Update `e2e/package.json`: set `"type": "module"` (was `commonjs`), set `"name": "kanban-e2e"`, `"private": true`, `"description": "End-to-end user flow checks for the kanban board"`, remove `"main"`, add `"engines": { "node": ">=20" }`, and add scripts `"test": "playwright test"`, `"test:headed": "playwright test --headed"`, `"report": "playwright show-report"`, `"install:browser": "playwright install chromium"` (R-13). Keep devDependencies `@playwright/test` ^1.64.1 and `@types/node` unchanged; add no other dependency. Run `npm install` in `e2e/` so `e2e/package-lock.json` stays in sync.
- [X] T002 [P] Make sure `e2e/.gitignore` ignores `node_modules/`, `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/` (already mostly present; keep existing lines, add anything missing).
- [X] T003 After T001, run `npm run install:browser` in `e2e/` to download Chromium, and confirm `backend/` (`uv sync`) and `frontend/` (`npm ci`) dependencies are installed so managed mode can start them. No files change in this task.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared run configuration, target selection, naming, API setup helpers and board helpers that every check uses. Covers the blocking half of US4 (FR-007, FR-008, FR-010, FR-014).

**⚠️ CRITICAL**: No check can be written until this phase is complete.

- [X] T004 Create `e2e/support/env.js` (single source of run settings for config and tests, data-model.md "Run"/"Target"). Export:
  - `runId`: `process.env.E2E_RUN_ID`; if unset, generate `YYYYMMDDTHHMMSS-xxxx` (UTC timestamp + 4 random lowercase hex chars, e.g. `20261101T153012-a3f9`) using `node:crypto` `randomBytes(2)`, and write it back with `process.env.E2E_RUN_ID = runId` so Playwright workers inherit the same id (R-05).
  - `mode`: `'managed'` when `process.env.BASE_URL` is unset or empty, else `'external'`.
  - `baseURL`: `BASE_URL` or `'http://localhost:5173'`; `apiURL`: `API_URL` or `'http://localhost:8000'`. Strip any trailing `/` from both. Rule: "Absolute `http(s)` URL, no trailing slash"; `apiURL` is "without `/api/v1`; the suite appends the prefix". Throw `Error('Invalid BASE_URL: <value>')` / `Error('Invalid API_URL: <value>')` if the value is not an absolute `http:` or `https:` URL (`new URL()` + protocol check).
  - If `mode === 'external'` and `API_URL` is unset or empty, throw `Error('API_URL is required when BASE_URL is set (backend address used for test setup)')`. `apiURL` defaults to `http://localhost:8000` only in managed mode.
  - If `mode === 'managed'` and `API_URL` is set (non-empty), throw `Error('API_URL is set but BASE_URL is not: set both to target a running app, or unset API_URL for a managed run')`. Otherwise setup data would go to a different backend than the one managed mode starts (FR-007, R-03).
  - `apiPrefix`: `` `${apiURL}/api/v1` ``.
  - `databaseURL` (managed mode only): `` `sqlite:///${join(os.tmpdir(), `kanban-e2e-${runId}.db`)}` `` — never `backend/kanban.db` (EC-003).
- [X] T005 [P] Create `e2e/support/names.js` exporting `uniqueName(label)` → `` `E2E ${runId} ${label}` `` (import `runId` from `./env.js`). Throw if the result exceeds 100 characters (board name limit "maxLength 100"; ticket title limit is "maxLength 200"). Labels are short words such as `create`, `move drag`, `edit` (R-09). The `E2E ` prefix is reserved for suite data.
- [X] T006 Rewrite `e2e/playwright.config.js` per plan.md "Key configuration" and research R-03…R-07 (depends on T004). Import `{ defineConfig, devices }` from `@playwright/test` and `{ mode, baseURL, apiURL, databaseURL }` from `./support/env.js` (importing env.js first sets `E2E_RUN_ID`). Remove all scaffold comments, the commented-out browsers and `retries: process.env.CI ? 2 : 0`. Settings:
  - `testDir: './tests'`, `outputDir: 'test-results'`, `globalSetup: './global-setup.js'`
  - `fullyParallel: false`, `workers: 1`, `retries: 0` (FR-014 — no retries anywhere, including CI), `forbidOnly: !!process.env.CI`
  - `timeout: 60_000`, `expect: { timeout: 10_000 }`
  - `reporter: [['list'], ['html', { open: 'never' }]]`
  - `use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off', actionTimeout: 10_000, navigationTimeout: 15_000 }`
  - `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`
  - `webServer`: `undefined` when `mode === 'external'` (start nothing, FR-007/AS-005). In managed mode an array of two entries, both `reuseExistingServer: false`, `timeout: 60_000`, `stdout: 'ignore'`, `stderr: 'pipe'`:
    - Backend: `command: 'uv run uvicorn app.main:app --port 8000'` (no `--reload`), `cwd: '../backend'` resolved with `fileURLToPath(new URL('../backend', import.meta.url))`, `url: 'http://localhost:8000/api/v1/boards'`, `env: { DATABASE_URL: databaseURL, SEED_ON_STARTUP: 'false', CORS_ORIGINS: 'http://localhost:5173' }`.
    - Frontend: `command: 'npm run dev -- --port 5173 --strictPort'`, `cwd` = `../frontend` resolved the same way, `url: 'http://localhost:5173'`, `env: { VITE_API_BASE_URL: 'http://localhost:8000' }`.
  - Add a one-line comment explaining why `reuseExistingServer` is `false` (never test against the developer's own database, EC-003).
  - Before editing, confirm against `backend/app/config.py` that the env names `DATABASE_URL`, `SEED_ON_STARTUP`, `CORS_ORIGINS` are the ones the backend reads and that `CORS_ORIGINS` accepts a single origin string in that format; and against `frontend/src/api/client.ts` that the frontend reads `VITE_API_BASE_URL`. If a name differs, use the real name and note it in research.md R-04 (do not change backend/frontend).
- [X] T007 Create `e2e/global-setup.js` (FR-008, R-07; depends on T004). Default-export an async function that, using Node's built-in `fetch` with `AbortSignal.timeout(5_000)`, requests `GET ${baseURL}` and `GET ${apiPrefix}/boards`; an address counts as unreachable on a network error, timeout, or non-2xx status. Collect every failure, then if any, `throw new Error` with one line per failure in the exact form `E2E target unreachable: <address> (<reason>)` (reason = error message or `HTTP <status>`). On success, `console.log` one line: `E2E run <runId> — mode <mode>, web <baseURL>, api <apiURL>`.
- [X] T008 Create `e2e/support/api.js` (FR-004, R-08, contracts/ui-locators.md §1; depends on T004). Export an async factory `createApi(playwright)` that returns `await playwright.request.newContext({ baseURL: apiPrefix + '/' })`-backed helpers (or accept the `request` fixture — pick one style and use it consistently; the context's `baseURL` must be `API_URL` + `/api/v1`). Helpers, using only endpoints and bodies from `specs/001-kanban-ticketing/contracts/openapi.json`:
  - `createBoard(name)` → `POST boards` body `{ name }` (BoardCreate: `name` "minLength 1, maxLength 100"), expect 201, return `{ id, columns }` where `columns` is `BoardCreated.columns[]` mapped to `{ id, name }`; also return a `columnId(name)` helper that throws if the column name is not found.
  - `createTicket(boardId, fields)` → `POST boards/{boardId}/tickets` with TicketCreate fields `title` (required, "minLength 1, maxLength 200"), `description` (default `""`, "maxLength 10000"), `type` (enum `bug` | `feature` | `task`, default `task`), `priority` (enum `low` | `medium` | `high` | `critical`, default `medium`), `assignee` (string "maxLength 100" or `null`). Send only provided fields (`additionalProperties: false`). If `fields.title` is omitted, default it to `uniqueName('ticket')`, so tickets created in setup are always test-named (FR-005). Expect 201; return `{ key, title }` from the `Ticket` response.
  - `moveTicket(key, columnId, position)` → `POST tickets/{key}/move` body `{ column_id: columnId }` plus `position` only when given ("zero-based; omitted means the bottom of the target column"). Expect 200.
  - On any unexpected status, throw `Error('<METHOD> <path> → <status>: <code> <message>')` built from the uniform error body `{ error: { code, message, details } }` (Constitution VII); fall back to the raw text if the body is not that shape.
  - Dispose the request context in the fixture teardown (see T010).
- [X] T009 Create `e2e/support/board.js` (R-10, R-11, contracts/ui-locators.md §2 and "Drag gesture"). Before writing, open `frontend/src/features/board/Column.tsx`, `TicketCard.tsx`, `BoardDnd.tsx` and confirm the heading text pattern (column name followed by its count), the card `aria-label` (`` `${key} ${title}` ``) and the `MouseSensor` activation distance; fix the helper (not the product) if anything differs. Export:
  - `openBoard(page, boardId)` → `page.goto('/boards/' + boardId)` then wait for the To Do column heading to be visible.
  - `column(page, name)` → `page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: new RegExp('^' + escapeRegExp(name) + '\\s*\\d+$') }) })`. Comment: the only structural locator in the suite; column sections have no accessible name (R-10, follow-up: `aria-labelledby` in `Column.tsx`).
  - `card(col, key, title)` → `col.getByRole('link', { name: `${key} ${title}`, exact: true })`.
  - `cardsIn(col)` → `col.getByRole('link', { name: /^TKT-\d+ / })`.
  - `dragCard(page, source, target)` → `await source.hover()`, read `source.boundingBox()`, `page.mouse.down()`, `page.mouse.move(x + 10, y + 10)` (past the 6 px activation), read `target.boundingBox()`, `page.mouse.move(targetX, targetY, { steps: 15 })`, `page.mouse.up()`. `target` may be a column locator (aim at its centre) or a card locator with option `{ edge: 'top' }` (aim at the top quarter of that card, for reorders). No sleeps.
- [X] T010 Create `e2e/support/fixtures.js` (depends on T008): `export const test = base.extend({ api: async ({ playwright }, use) => { const api = await createApi(playwright); await use(api); await api.dispose(); } })` and re-export `expect` from `@playwright/test`. All spec files import `test`/`expect` from here.
- [X] T011 Smoke-check the foundation: from `e2e/` run `npx playwright test --list` (config loads; zero tests is fine). Fix config until it loads. The unreachable-target check needs at least one test to exist, so it is validated later in T014a.

**Checkpoint**: Config, target selection, reachability check and helpers ready — checks can now be written.

---

## Phase 3: User Story 1 - Verify creating a ticket (Priority: P1) 🎯 MVP

**Goal**: Prove an end user can create a ticket in the UI and it is persisted by the backend.

**Independent Test**: `cd e2e && npm test -- tests/create-ticket.spec.js` passes on a healthy app and fails if creation is broken in frontend, backend or the link between them.

- [X] T012 [US1] Before writing the check, open `frontend/src/features/board/TicketCreateDialog.tsx` and `BoardHeader.tsx` and confirm: the trigger button text `+ New ticket`, the dialog accessible name `New ticket`, the field labels `Title`, `Description`, `Type`, `Priority`, `Assignee`, that Type/Priority are `<select>`s and their visible option labels, the submit button text `Create ticket`, and the `Required` message. If any text differs from contracts/ui-locators.md, update that contract file and use the real text.
- [X] T013 [US1] Create `e2e/tests/create-ticket.spec.js` with `test.describe('create', ...)` and check **"shows the new ticket at the bottom of To Do after reload"** (US1 AS-1): setup via `api.createBoard(uniqueName('create'))` plus one existing ticket via `api.createTicket` (so "bottom of To Do" is meaningful); `openBoard`; in `test.step('create a ticket from the board', ...)` click `+ New ticket`, fill Title `uniqueName('create new ticket')`, Description `Created by the E2E suite`, select Type `Bug` and Priority `High` (by visible label), Assignee `e2e-bot`, click `Create ticket`; expect the dialog to close. Read the new card from `cardsIn(column(page,'To Do')).last()`, assert its accessible name matches `/^TKT-\d+ <escaped title>$/` and capture the key. `page.reload()`; assert the same card (key + title) is still the last card in To Do; open it and assert the drawer shows the title, description, type `Bug`, priority `High` and assignee `e2e-bot`. First run it asserting the card is in `In Progress` to see it fail, then fix the assertion (Constitution IV).
- [X] T014 [US1] In `e2e/tests/create-ticket.spec.js` add check **"rejects a ticket without a title"** (US1 AS-2): own board `uniqueName('create required')`; open the create dialog, leave Title empty, click `Create ticket`; expect `getByText('Required')` visible inside the dialog and the dialog still open; close the dialog (Escape or its Cancel button, whichever exists), `page.reload()`, and assert `cardsIn(column(page,'To Do'))` has count 0.
- [X] T014a [US1] Validate the reachability check (quickstart Scenario 3, FR-008) now that checks exist: `BASE_URL=http://localhost:5999 API_URL=http://localhost:8999 npx playwright test` must stop before any check, with one line per address in the form `E2E target unreachable: <address> (<reason>)`. Fix `e2e/global-setup.js` until it does.

**Checkpoint**: `npm test -- tests/create-ticket.spec.js` green in managed mode — MVP.

---

## Phase 4: User Story 2 - Verify moving a ticket between columns (Priority: P2)

**Goal**: Prove drag across columns, move from the detail view, history recording and reorder within a column all persist.

**Independent Test**: `cd e2e && npm test -- tests/move-ticket.spec.js` passes alone; each check creates its own board and tickets through the API.

- [X] T015 [US2] Before writing the checks, open `frontend/src/features/ticket/TicketDrawer.tsx`, `MoveToColumnSelect.tsx`, `HistoryTab.tsx` and `frontend/src/features/board/BoardDnd.tsx` and confirm: the `Move to` label, the `Move` button, any "Saving move…" status text, the `History` tab name, history item texts `Created in <column>` and `<from> → <to>` (the `→` is U+2192), and the drawer `Close` button. Update contracts/ui-locators.md if any text differs.
- [X] T016 [US2] Create `e2e/tests/move-ticket.spec.js` with `test.describe('move', ...)` and check **"drags a card from To Do to In Progress"** (US2 AS-1): own board `uniqueName('move drag')`, one ticket via API; `openBoard`; in a step `dragCard(page, card(todo,...), column(page,'In Progress'))`; assert the card is visible in In Progress and has count 0 in To Do; wait until any "Saving move…" text is gone; `page.reload()`; assert again (EC-005: the reload result is what counts).
- [X] T017 [US2] In `e2e/tests/move-ticket.spec.js` add check **"moves a ticket to Review from the detail view"** (US2 AS-2): own board `uniqueName('move drawer')`; two tickets via API, both moved to In Progress via `api.moveTicket` (plus one more ticket moved straight to Review via API so "bottom of Review" is meaningful); open the target card, `getByLabel('Move to').selectOption({ label: 'Review' })`, click `Move`; close the drawer; `page.reload()`; assert the ticket is `cardsIn(column(page,'Review')).last()` and not in In Progress.
- [X] T018 [US2] In `e2e/tests/move-ticket.spec.js` add check **"records creation and both column changes in history"** (US2 AS-3): own board `uniqueName('move history')`; one ticket via API; through the UI move it To Do → In Progress (drag) and In Progress → Review (detail view), each confirmed visible before the next step; `page.reload()`; open the card, click `getByRole('tab', { name: /^History/ })`; assert the history list items `toHaveText` exactly `['Created in To Do', 'To Do → In Progress', 'In Progress → Review']` in that order (use a regex per item if each item also shows a timestamp; confirm in T015). If the drawer lists newest first, assert the reversed order and note it in contracts/ui-locators.md.
- [X] T019 [US2] In `e2e/tests/move-ticket.spec.js` add check **"reorders a card to the top of its column"** (US2 AS-4): own board `uniqueName('move reorder')`; three tickets A, B, C created via API in that order (all in To Do); `openBoard`; `dragCard(page, card(C), card(A), { edge: 'top' })`; assert `cardsIn(todo)` names are `[C, A, B]`; wait for save; `page.reload()`; assert the order `[C, A, B]` again with `toHaveText`/accessible-name assertions on `cardsIn(todo)`.

**Checkpoint**: Create and move checks green, independently and together.

---

## Phase 5: User Story 3 - Verify editing a ticket (Priority: P3)

**Goal**: Prove every editable field persists and the key, column and position do not change.

**Independent Test**: `cd e2e && npm test -- tests/edit-ticket.spec.js` passes alone.

- [X] T020 [US3] Before writing the checks, open `frontend/src/features/ticket/TicketEditForm.tsx`, `TicketView.tsx` and `InlineError.tsx` and confirm: the `Edit` and `Save` buttons, labels `Title`, `Description`, `Assignee`, radiogroups named `Type` and `Priority` with radios named by visible labels, and the exact error text shown when Title is empty. Update contracts/ui-locators.md if any text differs.
- [X] T021 [US3] Create `e2e/tests/edit-ticket.spec.js` with `test.describe('edit', ...)` and check **"saves every edited field and keeps key, column and position"** (US3 AS-1): own board `uniqueName('edit')`; three tickets via API in To Do (type `task`, priority `medium`, assignee `null`), **no moves**, so setup needs only `POST boards` and `POST tickets` (keeps this check passing when moves are broken, T027); open the middle card (index 1 of To Do), click `Edit`, set Title `uniqueName('edit changed')`, Description `Edited by the E2E suite`, Type radio `Bug`, Priority radio `Critical`, Assignee `e2e-editor`; click `Save`; close the drawer; `page.reload()`; assert `cardsIn(column(page,'To Do')).nth(1)` has name `` `${key} ${newTitle}` `` (same key, same column, same position), then open it and assert every new value in the detail view.
- [X] T022 [US3] In `e2e/tests/edit-ticket.spec.js` add check **"rejects an empty title and keeps the old one"** (US3 AS-2): own board `uniqueName('edit required')`; one ticket via API; open it, `Edit`, clear Title, click `Save`; expect the title error (text confirmed in T020) visible and the form still in edit mode; close the drawer (discard), `page.reload()`; assert the card in To Do still has name `` `${key} ${originalTitle}` ``.

**Checkpoint**: All three flow files green, in any order and alone.

---

## Phase 6: User Story 4 - Run the same suite locally or against a deployed environment (Priority: P1)

**Goal**: One documented command for a default local run; the same suite against any target by setting `BASE_URL`/`API_URL`; clear failure evidence.

**Independent Test**: quickstart Scenarios 1–4 behave as described.

- [X] T023 [P] [US4] Write `e2e/README.md`: purpose (create/move/edit checks against the real app; deletion not checked because the product has no delete); prerequisites (`(cd backend && uv sync)`, `(cd frontend && npm ci)`, `(cd e2e && npm ci && npm run install:browser)`, Node ≥ 20, ports 8000 and 5173 free); the one command `cd e2e && npm test`; managed mode (what it starts, throwaway DB at `<os tmpdir>/kanban-e2e-<runId>.db`, never `backend/kanban.db`, fails if ports are taken); external mode with `BASE_URL` and `API_URL` (`API_URL` is required whenever `BASE_URL` is set, and setting `API_URL` alone is an error; table from contracts/run-interface.md, including target requirements: frontend built with `VITE_API_BASE_URL` = `API_URL`, backend `CORS_ORIGINS` allows `BASE_URL`, dedicated test/staging only, leftover `E2E <runId> …` boards are never cleaned up); running one file, headed mode, `npm run report`; failure evidence (`test-results/<check>/trace.zip`, screenshot, `npx playwright show-trace <path>`); no retries by design; `E2E_RUN_ID` and `CI` variables.
- [X] T024 [P] [US4] Add a short "End-to-end tests" section to the root `README.md` pointing to `e2e/README.md` with the one command `cd e2e && npm test`.
- [X] T025 [US4] Validate quickstart Scenario 1 (default local run): with nothing on 8000/5173, note the mtime of `backend/kanban.db`, run `cd e2e && npm test`, confirm all 8 checks pass, total time < 3 min (SC-001), both servers are stopped afterwards (`lsof -i :8000 -i :5173` empty), and `backend/kanban.db` mtime is unchanged.
- [X] T026 [US4] Validate quickstart Scenarios 2 and 4: start backend and frontend manually, save `GET http://localhost:8000/api/v1/boards`, run `BASE_URL=http://localhost:5173 API_URL=http://localhost:8000 npm test` (nothing new started, all pass), compare boards before/after — only `E2E <runId> …` boards added (SC-006). With the manual backend still running, run plain `npm test` and confirm it stops on the busy port without writing any board. Stop the manual servers.
- [X] T027 [US4] Validate quickstart Scenario 5 (failure evidence, SC-004/SC-005): temporarily make `POST /tickets/{key}/move` in `backend/app/routers/tickets.py` raise an error, run `npm test`, confirm only the move checks (T016–T019) fail while the create checks (T013–T014) and edit checks (T021–T022) pass — if a create or edit check fails, its setup depends on the move endpoint (through the UI or `api.moveTicket`) and must be changed to avoid it — and that the output names the failing `test.step` and paths to `trace.zip` and the screenshot. **Revert** the change. Then make `PATCH /tickets/{key}` in the same file raise an error, run `npm test`, and confirm only the edit checks (T021–T022) fail (SC-004 case b). **Revert the backend change** and confirm `git diff backend/` is empty.

**Checkpoint**: The suite meets every US4 acceptance scenario.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 Run quickstart Scenario 6 (stability, SC-003): `cd e2e && for i in $(seq 10); do npm test || break; done` — 10 consecutive green runs. Any flake is fixed by waiting on a visible outcome, never by adding sleeps or retries.
- [X] T029 [P] Run quickstart Scenario 7 (isolation, FR-013): `(cd frontend && npm test) && (cd backend && uv run pytest)` pass with no running app; confirm neither `frontend/package.json` nor backend deps reference Playwright.
- [X] T030 [P] Audit `e2e/tests/` and `e2e/support/`: `grep -rn "waitForTimeout\|data-testid\|\.only(\|retries" e2e/tests e2e/support` returns nothing; the only `locator('section')` is in `e2e/support/board.js`; every check calls `page.reload()` before its final assertion; `git diff --stat main -- backend frontend` shows no changes from this feature (AS-011).
- [X] T031 [P] Add a follow-up note to `specs/003-e2e-user-flows/research.md` R-10 if not already present: "Follow-up (future frontend feature): add `aria-labelledby` to the column `<section>` in `frontend/src/features/board/Column.tsx` so `column()` can use `getByRole('region', { name })`." Also record in contracts/ui-locators.md any text corrections found in T012/T015/T020.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup. BLOCKS all checks. Order inside: T004 → (T005 [P], T006, T007, T008, T009) → T010 → T011.
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)**: each only needs Phase 2. T014a runs after T014 (it needs at least one check to exist). They touch different spec files, so they can be written in parallel.
- **US4 (Phase 6)**: T023/T024 can start any time after Phase 2; T025–T027 need US1–US3 done (they validate the full suite).
- **Polish (Phase 7)**: after Phase 6.

### User Story Dependencies

- **US1 (P1)**: independent; setup via API, not via the create screen.
- **US2 (P2)**: independent of US1 (tickets come from `api.createTicket`).
- **US3 (P3)**: independent of US1/US2 (setup moves go through `api.moveTicket`).
- **US4 (P1)**: its blocking parts (config, global setup, env) are in Phase 2; its validation needs the other stories' checks to exist.

### Within Each Story

- Confirm UI texts against the components first (T012, T015, T020), then write checks in the same spec file sequentially (same file → no [P] between them).
- Each check is first seen failing against a deliberately wrong expectation, then corrected (Constitution IV).

### Parallel Opportunities

- Phase 1: T002 alongside T001; T003 after T001.
- Phase 2: after T004, T005, T007, T008 and T009 touch different files and can be written in parallel; T006 too.
- Stories: Phases 3, 4, 5 in parallel (three files: `create-ticket.spec.js`, `move-ticket.spec.js`, `edit-ticket.spec.js`), plus T023/T024 docs.
- Polish: T029, T030, T031.

---

## Parallel Example: after Phase 2

```bash
Task: "T013–T014 [US1] create-ticket checks in e2e/tests/create-ticket.spec.js"
Task: "T016–T019 [US2] move-ticket checks in e2e/tests/move-ticket.spec.js"
Task: "T021–T022 [US3] edit-ticket checks in e2e/tests/edit-ticket.spec.js"
Task: "T023 [US4] e2e/README.md"
```

Note: `workers: 1` makes the *run* serial; writing the files in parallel is still safe.

---

## Implementation Strategy

### MVP First

1. Phase 1 + Phase 2 (config, reachability, helpers).
2. Phase 3 (US1 create checks).
3. **STOP and VALIDATE**: `cd e2e && npm test` starts both apps, runs the 2 create checks green, stops the apps. This already satisfies the core of US4 AS-1.

### Incremental Delivery

1. MVP above.
2. Add US2 move checks → run the suite → green.
3. Add US3 edit checks → green.
4. US4 docs + quickstart validation (Scenarios 1–5).
5. Polish: 10× stability run, isolation, audit.

---

## Notes

- 8 checks total: US1 ×2, US2 ×4, US3 ×2 (plan.md Scale/Scope).
- Never change `backend/` or `frontend/` except the temporary, reverted break in T027.
- If a UI text in contracts/ui-locators.md is wrong, fix the helper or spec and the contract doc, never add test ids to the product.
- Commit after each phase.
