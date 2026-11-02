# Contract: Running the E2E Suite

How developers (and, later, CI) invoke the suite. Changing target is configuration only (SC-002).

## Commands (run from `e2e/`)

| Command | Effect |
|---------|--------|
| `npm ci` | Install the suite's own dependencies (independent of `frontend/` and `backend/`) |
| `npm run install:browser` | Download Chromium for Playwright (once per machine) |
| `npm test` | Run every check (`playwright test`) |
| `npm test -- tests/move-ticket.spec.js` | Run one file; any check can run alone (FR-004) |
| `npm run test:headed` | Same, with a visible browser |
| `npm run report` | Open the last HTML report |

## Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `BASE_URL` | unset | Frontend address. **Unset** → managed mode: starts backend and frontend. **Set** → external mode: starts nothing |
| `API_URL` | `http://localhost:8000` in managed mode; **required** when `BASE_URL` is set; **must be unset** when `BASE_URL` is unset | Backend address (no `/api/v1`), used for setup data and the reachability check. Setting it without `BASE_URL` stops the run before anything starts |
| `E2E_RUN_ID` | generated | Optional override of the run identifier |
| `CI` | unset | When set, `test.only` fails the run |

## Managed mode (default)

| Process | Command | cwd | Port | Env |
|---------|---------|-----|------|-----|
| Backend | `uv run uvicorn app.main:app --port 8000` | `../backend` | 8000 | `DATABASE_URL=sqlite:///<tmp>/kanban-e2e-<runId>.db`, `SEED_ON_STARTUP=false`, `CORS_ORIGINS=http://localhost:5173` |
| Frontend | `npm run dev -- --port 5173 --strictPort` | `../frontend` | 5173 | `VITE_API_BASE_URL=http://localhost:8000` |

Both are stopped when the run ends. If either port is already in use, the run fails before any
check (`reuseExistingServer: false`) rather than testing the developer's own app.

Prerequisites: `uv sync` done in `backend/`, `npm ci` done in `frontend/`.

## External mode

Requirements on the target:

- The frontend at `BASE_URL` was built with `VITE_API_BASE_URL` pointing at `API_URL`.
- The backend allows `BASE_URL`'s origin in `CORS_ORIGINS`.
- It is a dedicated test/staging environment where leftover `E2E …` boards are acceptable
  (AS-010). The suite never deletes or modifies data it did not create.

## Exit and output

| Situation | Outcome |
|-----------|---------|
| All checks pass | Exit 0; `list` reporter prints one line per check |
| Target unreachable | Exit ≠ 0 before any check; message `E2E target unreachable: <address> (<reason>)` |
| A check fails | Exit ≠ 0; reporter prints the failing step and the paths to `test-results/<check>/trace.zip` and its screenshot; HTML report in `playwright-report/` |
| A check would have passed on retry | Not possible; `retries: 0` (FR-014) |

`test-results/` and `playwright-report/` are git-ignored.
