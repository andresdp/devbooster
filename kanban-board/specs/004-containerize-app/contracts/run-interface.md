# Contract: Run Interface (commands and configuration)

**Feature**: `004-containerize-app`

The public interface of this feature is the set of commands a person runs and the settings they
can supply. All commands run from the repository root. Host prerequisites: Docker Engine ≥ 25 (or
Docker Desktop ≥ 4.27) with Compose ≥ 2.24, Git, and a POSIX shell for the two scripts (macOS,
Linux, WSL).

## Commands

| Purpose | Command | Contract |
|---|---|---|
| Start (build if needed) | `docker compose up -d --build --wait` | Exits 0 only when both services are healthy; app at `http://localhost:${KANBAN_PORT:-8080}`. Non-zero with Docker's message (naming the port) if the port is taken. |
| Start, foreground logs | `docker compose up --build` | Same app; Ctrl-C stops it, data kept. |
| Status / health | `docker compose ps` | Each service shows `healthy` / `unhealthy` / `starting`. |
| Logs | `docker compose logs -f [backend\|frontend]` | |
| Stop | `docker compose down` | Removes containers and network; **keeps** the data volume. Nothing listens on the port afterwards. |
| Reset (destructive) | `docker compose down -v` | Also deletes the `kanban-data` volume (all boards, tickets, comments, history). Next start seeds the sample board again. Never part of start/stop. |
| E2E against containers | `scripts/e2e-docker.sh [playwright args]` | See below. |
| Container smoke check | `scripts/docker-smoke.sh` | Exits 0 only if every check in research R14 passes; tears down its own `kanban-smoke` project. |

### `scripts/e2e-docker.sh`

- Uses Compose project `kanban-e2e` with `-f compose.yaml -f compose.e2e.yaml`. Never touches project
  `kanban` or its volume; publishes no host port.
- Steps: build images → start backend (unseeded) and frontend, wait healthy → run the Playwright
  container (`BASE_URL`/`API_URL` = `http://frontend:8080`, `CI=1`) → copy evidence to the host →
  always tear down `kanban-e2e` including its volume.
- Extra arguments are passed to `playwright test` (e.g. `tests/move-ticket.spec.js`).
- **Exit code**: the Playwright runner's exit code (0 = all checks passed). A build or startup failure
  exits non-zero before any check runs.
- **Evidence on the host** (replaced on each run, both gitignored):
  `e2e/test-results/<check>/trace.zip` + screenshot for each failing check, and
  `e2e/playwright-report/` (HTML report). Open with the host's `npx playwright show-trace` /
  `show-report`, or any Playwright trace viewer.
- The suite's own rules are unchanged: no retries, one worker, `test.only` rejected.

### Unchanged commands (FR-019)

`backend/README.md`, `frontend/README.md` and `e2e/README.md` commands (`uv run uvicorn …`,
`uv run pytest`, `npm run dev`, `npm test`, `npm run typecheck`, `cd e2e && npm test` in managed and
external mode) behave exactly as before. No file they read is changed, except docs.

## Configuration

Read by Compose from the shell or from the root `.env` (gitignored; template in the versioned root
`.env.example`). Compose uses them for interpolation only — the `.env` file is never passed into a
container. All have defaults, so no `.env` is required.

| Variable | Default | Effect |
|---|---|---|
| `KANBAN_PORT` | `8080` | Host port of the app. |
| `KANBAN_BIND_ADDRESS` | `127.0.0.1` | Host interface the port binds to. `0.0.0.0` lets other devices on the network reach the app — it has **no login**. |
| `KANBAN_SEED_ON_STARTUP` | `true` | Seed the sample board when the store is empty. |
| `KANBAN_CORS_ORIGINS` | *(empty)* | Extra allowed cross-origin addresses, comma-separated. Not needed for the default same-origin setup. `*` is rejected. |
| `KANBAN_DATABASE_URL` | `sqlite:////data/kanban.db` | Backend database location (inside the volume). |
| `KANBAN_BACKEND_UPSTREAM` | `http://backend:8000` | Where nginx forwards `/api/`, `/docs`, `/openapi.json`. |
| `KANBAN_IMAGE_TAG` | `local` | Tag of the locally built images (`kanban-backend`, `kanban-frontend`, `kanban-e2e`). The smoke and E2E scripts set their own tag (`smoke`, `e2e`) so they never retag the images your own app uses. |

Changing any of these takes effect on the next `docker compose up -d` without rebuilding images
(SC-006).

## Image-level environment (for running images outside Compose)

| Image | Variable | Default |
|---|---|---|
| backend | `DATABASE_URL` | `sqlite:////data/kanban.db` |
| backend | `CORS_ORIGINS` | *(empty)* |
| backend | `SEED_ON_STARTUP` | `true` |
| frontend | `BACKEND_UPSTREAM` | `http://backend:8000` |
