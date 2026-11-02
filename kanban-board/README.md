# Kanban board

- `backend/` — API (see `backend/README.md`)
- `frontend/` — web app (see `frontend/README.md`)
- `e2e/` — end-to-end user flow checks

The usual way to develop is still to run the backend and frontend directly on your machine, as
their READMEs describe. Docker is optional: the section below adds a second way to run the whole
app, and nothing in the non-container workflow changes.

## Run with Docker

### Prerequisites

Only these on the host (no Python, Node, uv or browsers):

- Docker Engine ≥ 25 or Docker Desktop ≥ 4.27, with Docker Compose ≥ 2.24 — check with
  `docker compose version`
- Git

The start, stop and reset commands below need nothing else. The two helper scripts also need:

- A POSIX shell (macOS, Linux, or WSL on Windows) for `scripts/e2e-docker.sh` and
  `scripts/docker-smoke.sh`
- `curl` for `scripts/docker-smoke.sh`

### Start, stop, reset

From the repository root:

```bash
docker compose up -d --build --wait     # build if needed, start, return when healthy
docker compose up --build               # same, with logs in the foreground (Ctrl-C stops it)
```

- App: http://localhost:8080
- API docs: http://localhost:8080/docs (the API itself is under http://localhost:8080/api/v1)

The first build downloads base images and dependencies and can take several minutes. Later starts
take seconds.

```bash
docker compose ps          # status; both services should be "healthy"
docker compose logs -f     # logs (add "backend" or "frontend" for one service)
docker compose down        # stop; your data is kept
```

> **DESTRUCTIVE — deletes all boards, tickets, comments and history of the containerized app:**
>
> ```bash
> docker compose down -v
> ```
>
> The next start seeds a fresh "Sample Project". Use it only when you really want to start over.

Data lives in the Docker volume `kanban-data`. It survives `down`/`up`, rebuilds and machine
restarts, and is separate from `backend/kanban.db` used by the non-container backend.

### Settings

Set these in your shell or in a root `.env` file (template: `.env.example`). Compose uses them only
to fill in `compose.yaml`; the `.env` file is never passed into a container. All have defaults, so
no `.env` is needed.

| Variable | Default | Effect |
|---|---|---|
| `KANBAN_PORT` | `8080` | Host port of the app. |
| `KANBAN_BIND_ADDRESS` | `127.0.0.1` | Host interface the port binds to. `0.0.0.0` lets other devices on the network reach the app — it has **no login**. |
| `KANBAN_SEED_ON_STARTUP` | `true` | Seed the sample board when the store is empty. |
| `KANBAN_CORS_ORIGINS` | *(empty)* | Extra allowed cross-origin addresses, comma-separated. Not needed for the default same-origin setup. `*` is rejected. |
| `KANBAN_DATABASE_URL` | `sqlite:////data/kanban.db` | Backend database location (inside the volume). |
| `KANBAN_BACKEND_UPSTREAM` | `http://backend:8000` | Where nginx forwards `/api/`, `/docs` and `/openapi.json`. |
| `KANBAN_IMAGE_TAG` | `local` | Tag of the locally built images (`kanban-backend`, `kanban-frontend`, `kanban-e2e`). The smoke and E2E scripts set their own tag (`smoke`, `e2e`) so they never retag the images your own app uses. |

Changes take effect on the next `docker compose up -d`, without rebuilding.

**Port already in use.** If `up` fails with "port is already allocated" or "address already in
use", another program has port 8080. Pick another port:

```bash
KANBAN_PORT=9090 docker compose up -d --wait     # or put KANBAN_PORT=9090 in .env
```

**Network access.** By default only this machine can open the app. To let other devices on your
network reach it, set `KANBAN_BIND_ADDRESS=0.0.0.0`. The app has **no login**, so anyone who can
reach the port can read and change every board.

### Checks

```bash
scripts/e2e-docker.sh        # the E2E suite against the containers (own throwaway project)
scripts/docker-smoke.sh      # container checks: health, routes, ports, persistence, hardening
```

`scripts/e2e-docker.sh` leaves failure evidence in `e2e/test-results/` and the HTML report in
`e2e/playwright-report/`; see [`e2e/README.md`](e2e/README.md#run-in-docker). Both scripts use
their own Compose projects and never touch your app or its data.

## End-to-end tests

```bash
cd e2e && npm test
```

See [`e2e/README.md`](e2e/README.md) for prerequisites, running against a deployed target, running in
Docker, and failure evidence.
