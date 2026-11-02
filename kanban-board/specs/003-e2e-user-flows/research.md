# Research: End-to-End User Flow Test Suite

**Feature**: `003-e2e-user-flows` | **Date**: 2026-11-01 | **Plan**: [plan.md](./plan.md)

Each entry records a decision, why it was made, and what else was considered. Facts about the
app were checked against the code on branch `002-kanban-web-frontend` (backend `app/config.py`,
`app/main.py`; frontend `src/api/client.ts`, `src/features/**`).

## R-01 Test runner and language

- **Decision**: Playwright Test (`@playwright/test`, already in `e2e/package.json` at `^1.64`)
  written in plain JavaScript (ES modules), Chromium only.
- **Rationale**: Requested by the user. Playwright drives a real browser (FR-001), auto-waits on
  locators and web-first assertions (FR-011), records traces and screenshots (FR-010), and can
  start servers through `webServer` (FR-007). One browser satisfies AS-003. JavaScript avoids a
  TypeScript build step in a project that has no shared code with `frontend/`.
- **Alternatives considered**: Cypress (weaker multi-origin and drag support, heavier);
  TypeScript tests (constitution's TypeScript rule covers `frontend/` only; adds a `tsconfig`
  for no gain here); Firefox/WebKit projects (out of scope, AS-003).

## R-02 Project location and isolation

- **Decision**: Self-contained project in `e2e/` at the repo root with its own `package.json`,
  `package-lock.json`, `node_modules` and `.gitignore`. Set `"type": "module"` (the scaffold
  currently says `commonjs` while `playwright.config.js` uses `import`).
- **Rationale**: FR-013: the frontend's Vitest suite and the backend's pytest suite must keep
  running without a live app and without Playwright installed. AS-009: the scaffold already
  exists there.
- **Alternatives considered**: `frontend/e2e/` (couples Playwright to the frontend's install
  and lint; Vitest could pick the files up); a root workspace (more moving parts, YAGNI).

## R-03 Choosing the target: `BASE_URL` / `API_URL`

- **Decision**:
  - `BASE_URL` unset → **managed mode**: `webServer` starts backend and frontend, and the suite
    uses `http://localhost:5173` (frontend) and `http://localhost:8000` (backend).
  - `BASE_URL` set → **external mode**: `webServer` is omitted entirely; the suite uses
    `BASE_URL` as the frontend and `API_URL` as the backend.
  - `API_URL` defaults to `http://localhost:8000` in managed mode and is required in external
    mode, so setup data can never go to a different backend than the one the frontend uses. It
    is only needed for setup calls (FR-004) and the reachability check (FR-008).
  - `API_URL` set while `BASE_URL` is unset is an error: the run stops before starting anything,
    because managed mode always uses its own backend on port 8000 (FR-007).
- **Rationale**: The user asked for `BASE_URL` as the single switch. The spec (FR-007) also needs
  the backend address because setup data goes straight to the API; the frontend's API address is
  baked into its build (`VITE_API_BASE_URL`), so the suite cannot discover it from the page.
  The default local run needs no variables; any external run sets both, because a forgotten
  `API_URL` would otherwise send setup data to a local backend while the browser uses another.
- **Alternatives considered**: Deriving the API address from `BASE_URL` (wrong for any deployment
  where API and web differ in host or port); a config file per environment (code/file change
  per target, violates SC-002).

## R-04 Starting the app in managed mode (throwaway database)

- **Decision**: Two `webServer` entries:
  - Backend: `uv run uvicorn app.main:app --port 8000`, `cwd: '../backend'`, env
    `DATABASE_URL=sqlite:///<os tmpdir>/kanban-e2e-<runId>.db`, `SEED_ON_STARTUP=false`,
    `CORS_ORIGINS=http://localhost:5173`; readiness `url: http://localhost:8000/api/v1/boards`.
  - Frontend: `npm run dev -- --port 5173 --strictPort`, `cwd: '../frontend'`, env
    `VITE_API_BASE_URL=http://localhost:8000`; readiness `url: http://localhost:5173`.
  - Both: `reuseExistingServer: false`, `timeout: 60_000`, `stdout: 'ignore'`,
    `stderr: 'pipe'`. Playwright stops both when the run ends.
- **Rationale**: The backend reads `DATABASE_URL`, `CORS_ORIGINS` and `SEED_ON_STARTUP` from the
  environment (`backend/app/config.py`), so the throwaway database needs no backend change
  (AS-011). A fresh file per run in the OS temp dir never touches `backend/kanban.db` (EC-003).
  No seed keeps the throwaway DB small; checks never rely on the sample board (FR-004).
  `reuseExistingServer: false` is deliberate: if the developer already has their own app on
  8000/5173, Playwright fails with "port already in use" instead of silently testing against
  their working database. The no-`--reload` uvicorn command keeps startup fast and stable.
- **Alternatives considered**: `reuseExistingServer: !CI` (Playwright's default template; would
  reuse the developer's backend and write test boards into their real data, breaking EC-003);
  in-memory SQLite (`sqlite://` is per-connection and lost between requests);
  deleting the temp DB after the run (not required; OS temp dir is cleaned by the OS).

## R-05 Run identifier shared across processes

- **Decision**: `playwright.config.js` sets `process.env.E2E_RUN_ID ??= <UTC timestamp>-<4 random
  hex>` (e.g. `20261101T153012-a3f9`) before building the config.
- **Rationale**: The config file is evaluated in the main process and again in each worker;
  writing to `process.env` once in the main process makes every worker (which inherits the
  environment) see the same id. It names the throwaway DB and all test data (FR-005, EC-002).
- **Alternatives considered**: `globalSetup` writing a file (more moving parts); `Date.now()`
  computed per import (differs between processes).

## R-06 Execution settings

- **Decision**: `workers: 1`, `fullyParallel: false`, `retries: 0`, `forbidOnly: !!process.env.CI`,
  `use.trace: 'retain-on-failure'`, `use.screenshot: 'only-on-failure'`, `use.video: 'off'`,
  `reporter: [['list'], ['html', { open: 'never' }]]`, `outputDir: 'test-results'`,
  `expect.timeout: 10_000`, `timeout: 60_000`, `use.actionTimeout: 10_000`,
  `use.navigationTimeout: 15_000`.
- **Rationale**: Serial execution, as requested (the checks share one backend/database; serial
  keeps the run predictable and the ticket-key sequence readable). Each check still creates its
  own board, so it can run alone or in any order (FR-004). `retries: 0` everywhere (FR-014;
  the scaffold's `CI ? 2 : 0` is removed). Trace + screenshot on failure only (FR-010); the trace
  contains the failing step, DOM snapshots and network log, so video adds nothing. The `list`
  reporter prints the failing step and the paths to the evidence; the HTML report is kept on
  disk without auto-opening. Generous but bounded timeouts handle slower deployed targets
  (EC-004) while still failing with Playwright's "waiting for …" message (FR-011).
- **Alternatives considered**: `trace: 'on-first-retry'` (never fires with zero retries);
  `video: 'retain-on-failure'` (redundant with trace, larger artifacts).

## R-07 Reachability check (FR-008)

- **Decision**: `globalSetup: './global-setup.js'` issues `GET <BASE_URL>` and
  `GET <API_URL>/api/v1/boards` with a 5 s timeout each and throws
  `E2E target unreachable: <address> (<reason>)` listing every unreachable address. Runs in
  both modes.
- **Rationale**: In Playwright, `webServer` processes are started and ready before
  `globalSetup` runs, so in managed mode the check confirms the servers are up, and in external
  mode it fails fast instead of every check timing out (US4 AS-3). Uses Node's built-in `fetch`
  (Node ≥ 18; the machine has Node 22), no extra dependency.
- **Alternatives considered**: Letting the first `page.goto` fail (one confusing error per
  check); `webServer` with `reuseExistingServer: true` as a health probe in external mode
  (would start servers when unreachable — forbidden by FR-007).

## R-08 Setup data through the API (FR-004)

- **Decision**: A small helper `e2e/support/api.js` built on Playwright's `request` fixture
  (`APIRequestContext` with `baseURL = API_URL`), exposing `createBoard(name)`,
  `createTicket(boardId, fields)` and `moveTicket(key, columnId, position?)`. Each throws with the
  response's uniform error body on a non-2xx status. Endpoints and bodies follow
  `specs/001-kanban-ticketing/contracts/openapi.json`; `createBoard` returns the columns from
  `BoardCreated` so checks look up column ids by name.
- **Rationale**: Fast, independent setup; a broken create screen only fails US1. The helper
  calls the documented contract (Principle II) and never reaches the database directly.
  Playwright's `request` needs no new dependency.
- **Alternatives considered**: Generating JS types from the contract (no type checking in plain
  JS, so no benefit); creating setup data through the UI (couples every check to the create
  screen; rejected in Clarifications).

## R-09 Test data naming (FR-005, EC-001/002)

- **Decision**: `e2e/support/names.js` exports `uniqueName(label)` →
  `` `E2E ${runId} ${label}` `` (e.g. `E2E 20261101T153012-a3f9 create`), used for boards and
  ticket titles. Each check creates exactly one board; within it, titles carry the same prefix.
  Max length ≈ 40 chars, under the 100 (board) and 200 (title) limits.
- **Rationale**: Visible, greppable prefix; unique per run and per check, so data from other
  runs or people never matches a locator. Locators are always scoped to the check's own board
  page, so even identical titles elsewhere cannot interfere.
- **Alternatives considered**: UUIDs (unique but unreadable in screenshots).

## R-10 Locators (FR-012) and the column gap

- **Decision**: Use `getByRole` / `getByLabel` / `getByText`, scoped as follows:
  - **Column**: `page.locator('section').filter({ has: page.getByRole('heading', { level: 2,
    name: new RegExp('^' + name + '\\s*\\d+$') }) })`, wrapped once in `support/board.js`
    as `column(page, name)`.
  - **Card**: `column.getByRole('link', { name: '<KEY> <title>' })` (card `aria-label` is
    `` `${key} ${title}` ``); card order = `column.getByRole('link', { name: /^TKT-\d+ / })`.
  - **Create dialog**: `getByRole('button', { name: '+ New ticket' })`, `getByRole('dialog',
    { name: 'New ticket' })`, fields by `getByLabel('Title' | 'Description' | 'Type' |
    'Priority' | 'Assignee')`, error `getByText('Required')`.
  - **Ticket drawer**: `getByRole('dialog')` labelled by the ticket heading; `getByRole('button',
    { name: 'Edit' | 'Save' | 'Move' | 'Close' })`, `getByLabel('Move to')`,
    `getByRole('radiogroup', { name: 'Type' | 'Priority' })` → `getByRole('radio', { name })`,
    `getByRole('tab', { name: /^History/ })` → `getByRole('listitem')` texts
    `Created in To Do`, `To Do → In Progress`, `In Progress → Review`.
- **Rationale**: Mirrors how a user finds things. Column `<section>` elements have no accessible
  name (no `aria-labelledby`), so `getByRole('region', { name })` does not match; the spec forbids
  product changes (AS-011). Filtering the `section` element by its visible heading is the
  narrowest structural dependency and is confined to one helper.
- **Alternatives considered**: `data-testid` / `data-ticket-key` attributes (internal structure,
  violates FR-012); adding `aria-labelledby` to `Column.tsx` (better accessibility and would allow
  `getByRole('region')`, but is a product change — recorded as a follow-up for a future feature).

## R-11 Drag and drop with dnd-kit (US2, EC-005)

- **Decision**: Drag with explicit mouse steps in `support/board.js` →
  `dragCard(page, card, target)`: `card.hover()`, `mouse.down()`, move 10 px (past the
  `MouseSensor` 6 px activation distance), then `mouse.move(targetX, targetY, { steps: 15 })`
  to the target's centre (column body or the top half of the first card for a reorder),
  `mouse.up()`. Outcome is asserted on screen, then again after `page.reload()` (FR-003, EC-005).
- **Rationale**: The board uses `@dnd-kit` with `MouseSensor({ distance: 6 })`; a single jump
  such as `locator.dragTo()` may not cross the activation distance with intermediate
  `pointermove` events, so it is unreliable. Stepped moves reproduce a real gesture.
- **Alternatives considered**: `locator.dragTo()` (flaky with dnd-kit); keyboard dragging
  (Space + arrows; valid but it exercises the keyboard sensor, not the drag a user does with a
  mouse — can be added later).

## R-12 Waiting strategy (FR-011)

- **Decision**: Only web-first assertions (`await expect(locator).toBeVisible()`,
  `toHaveText`, `toHaveCount`) and auto-waiting actions; no `waitForTimeout`. After a mutation,
  wait for the visible result (card in target column, "Saving move…" gone) before reloading.
- **Rationale**: Works on slow targets, fails with a message naming the locator it waited for.

## R-13 Commands and docs (FR-009)

- **Decision**: `e2e/package.json` scripts: `"test": "playwright test"`,
  `"test:headed": "playwright test --headed"`, `"report": "playwright show-report"`,
  `"install:browser": "playwright install chromium"`. `e2e/README.md` documents prerequisites,
  the one command (`npm test` from `e2e/`), `BASE_URL` / `API_URL`, and where failure evidence
  lands. Root README gets a short pointer.
- **Rationale**: One command for the default local run; targeting another app is an environment
  variable, not a code change (SC-002).

## R-14 CI

- **Decision**: No GitHub Actions workflow in this feature (user request; AS-008). The config
  stays CI-friendly: `forbidOnly` on CI, `retries: 0`, non-interactive reporters, and the HTML
  report never auto-opens.

## Implementation findings (2026-11-02)

- Follow-up (future frontend feature): add `aria-labelledby` to the column `<section>` in `frontend/src/features/board/Column.tsx` so `column()` can use `getByRole('region', { name })`.
- Product defect found by the suite: dropping a card on the **top quarter** of another card in the same column (3+ cards) crashes the board with React "Maximum update depth exceeded" (blank page). The reorder check releases at the card centre instead. Worth a frontend fix in `BoardDnd.tsx` (`onDragOver` oscillation).
- Env names confirmed: `DATABASE_URL`, `SEED_ON_STARTUP`, `CORS_ORIGINS` (backend `config.py`), `VITE_API_BASE_URL` (frontend `api/client.ts`).
- UI texts matched contracts/ui-locators.md; the history items also show a timestamp, so they are asserted with a start-anchored regex; the `Required` text needs `exact: true` (titles may contain "required").
