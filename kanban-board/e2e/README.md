# Kanban end-to-end checks

Browser checks that drive the real app (frontend + backend) the way a user does: create a ticket,
move it (drag and detail view), edit it. Deleting a ticket is not checked because the product has no delete.

## Prerequisites

```bash
(cd backend && uv sync)
(cd frontend && npm ci)
(cd e2e && npm ci && npm run install:browser)
```

Node >= 20, and ports 8000 and 5173 free for a managed run.

## Run

```bash
cd e2e && npm test
```

`npm run test:headed` shows the browser; `npm test -- tests/move-ticket.spec.js` runs one file;
`npm run report` opens the HTML report.

### Managed mode (default)

With `BASE_URL` unset, the suite starts the backend (port 8000) and the frontend (port 5173) itself,
against a throwaway database at `<os tmpdir>/kanban-e2e-<runId>.db` (never `backend/kanban.db`), and stops
them afterwards. It fails if the ports are already taken.

### External mode

```bash
BASE_URL=https://staging.example.com API_URL=https://api.staging.example.com npm test
```

| Variable | Meaning |
|----------|---------|
| `BASE_URL` | Frontend address (absolute http(s) URL). Setting it selects external mode; nothing is started. |
| `API_URL` | Backend address without `/api/v1`, used for test setup. Required whenever `BASE_URL` is set; setting it alone is an error. |
| `E2E_RUN_ID` | Optional run id (default: UTC timestamp + 4 hex chars). |
| `CI` | When set, `test.only` is rejected. |

Target requirements: the frontend was built with `VITE_API_BASE_URL` = `API_URL`; the backend `CORS_ORIGINS`
allows `BASE_URL`; use a dedicated test/staging target only. The suite never deletes data: boards named
`E2E <runId> …` stay behind.

## Run in Docker

Only Docker is needed on the host (no Node, browsers, Python or uv):

```bash
scripts/e2e-docker.sh [playwright args]     # from the repository root, e.g. tests/move-ticket.spec.js
```

It builds the images, starts the app in its own Compose project `kanban-e2e` (unseeded backend, no
host port), runs this suite unchanged in external mode from a Playwright container
(`BASE_URL`/`API_URL` = `http://frontend:8080`, `CI=1`), copies `test-results/` and
`playwright-report/` into `e2e/` (replaced on each run), and always removes the `kanban-e2e`
containers and volume. Your own `docker compose` app (project `kanban`) and its data are never
touched. The exit code is Playwright's: 0 when every check passed, non-zero when a check failed or
the app did not build or start.

To run the suite from the host against a containerized app, use a throwaway project, not your own app:

```bash
KANBAN_PORT=8081 KANBAN_SEED_ON_STARTUP=false docker compose -p kanban-e2e up -d --build --wait
BASE_URL=http://localhost:8081 API_URL=http://localhost:8081 npm test
docker compose -p kanban-e2e down -v     # deletes only the throwaway project's data
```

Pointing `BASE_URL` at your own `kanban` app also works, but leaves `E2E <runId> …` boards in your data.

**Version coupling**: the `mcr.microsoft.com/playwright:v<version>-noble` tag in `Dockerfile` must
equal the `@playwright/test` version locked in `package-lock.json` (now 1.64.1). Bump both together.

## Failure evidence

Each failing check reports the failing `test.step`, and saves `test-results/<check>/trace.zip` and a screenshot.
Open a trace with `npx playwright show-trace <path>`. There are no retries by design.

If the target is unreachable the run stops before any check with `E2E target unreachable: <address> (<reason>)`.
