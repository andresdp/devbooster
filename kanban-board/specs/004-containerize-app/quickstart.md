# Quickstart & Validation: Containerized Kanban App

**Feature**: `004-containerize-app`

Validation scenarios that prove the feature works. Commands and settings are defined in
[contracts/run-interface.md](contracts/run-interface.md); routes in
[contracts/http-routing.md](contracts/http-routing.md).

## Prerequisites

- Docker Engine ≥ 24 / Docker Desktop ≥ 4.27, Compose ≥ 2.24 (`docker compose version`).
- Git. Nothing else (no Python, Node, uv or browsers) for scenarios 1–6.
- The Docker daemon is running.

## 1. One-command start (US1, SC-001, SC-002)

```bash
git clone <repo> && cd kanban-board
docker compose up -d --build --wait
docker compose ps            # backend and frontend: healthy
```

Open http://localhost:8080.

**Expect**: "Sample Project" listed once; create a ticket, drag it to another column, edit it, add a
comment — all succeed with no console errors. http://localhost:8080/docs loads Swagger UI.
`curl -s localhost:8080/api/v1/boards` returns JSON. `curl localhost:8000` fails (backend not
published). First build < 10 min; later `up -d --wait` < 30 s.

## 2. Loopback only by default (FR-004a)

```bash
docker compose port frontend 8080      # → 127.0.0.1:8080
```

**Expect**: another device on the LAN cannot open `http://<host-ip>:8080`. With
`KANBAN_BIND_ADDRESS=0.0.0.0 docker compose up -d --wait` it can.

## 3. Persistence (US2, SC-003)

1. Create a ticket "persist-check" with a comment.
2. `docker compose down && docker compose up -d --wait` — repeat 3 times.
3. `docker compose up -d --build --wait` (rebuild).

**Expect**: the ticket, its comment and history are present every time; "Sample Project" still
appears once.

## 4. Reset (US2 scenario 4)

```bash
docker compose down -v      # DESTRUCTIVE: deletes all containerized app data
docker compose up -d --wait
```

**Expect**: only a freshly seeded "Sample Project"; "persist-check" is gone. `backend/kanban.db`
(non-container data) is untouched.

## 5. Settings from outside the images (US4, SC-006)

```bash
docker compose down
KANBAN_PORT=8090 KANBAN_SEED_ON_STARTUP=false KANBAN_CORS_ORIGINS=https://example.test \
  docker compose -p kanban-alt up -d --wait          # no --build: same images
curl -s localhost:8090/api/v1/boards                # → []
curl -si -X OPTIONS localhost:8090/api/v1/boards \
  -H 'Origin: https://example.test' -H 'Access-Control-Request-Method: POST' \
  | grep -i access-control-allow-origin            # → https://example.test
docker compose -p kanban-alt down -v                # throwaway project only
```

**Expect**: app on 8090 with no boards, the configured origin allowed, no image rebuilt.

## 6. E2E against the containers (US3, SC-004)

```bash
scripts/e2e-docker.sh
echo $?                      # 0 when all checks pass
```

**Expect**: all existing checks pass; afterwards `docker compose -p kanban-e2e ps -a` is empty and
`docker volume ls | grep kanban-e2e` shows nothing; your own app (scenario 1) is still running with
its data. To see failure evidence, temporarily break an expectation in a spec file: the script exits
non-zero and `e2e/test-results/<check>/trace.zip` plus a screenshot exist on the host. Revert the
change.

### Optional: host-run suite with `BASE_URL` pointing at a Compose app

Needs Node ≥ 20 and `cd e2e && npm ci && npm run install:browser` on the host.

```bash
KANBAN_PORT=8081 KANBAN_SEED_ON_STARTUP=false docker compose -p kanban-e2e up -d --build --wait
(cd e2e && BASE_URL=http://localhost:8081 API_URL=http://localhost:8081 npm test)
docker compose -p kanban-e2e down -v    # throwaway project only
```

Pointing `BASE_URL` at your own `kanban` app also works, but leaves `E2E <runId> …` boards in your data.

## 7. Image hygiene and hardening (US4 scenario 4, FR-016–FR-018)

```bash
scripts/docker-smoke.sh
```

**Expect**: exit 0. It checks health, routes, single loopback port, persistence across cycles, seeding
off, non-root users, and absence of `tests/`, `kanban.db`, `node_modules`, `.env` and `localhost:8000`
in the images. Run on both an Intel/AMD and an ARM (Apple Silicon) machine for FR-018.

## 8. Non-container workflow unchanged (US5, SC-005)

With Docker stopped:

```bash
(cd backend && uv sync && uv run pytest && uv run ruff check . && uv run ruff format --check .)
(cd frontend && npm ci && npm test && npm run typecheck)
(cd e2e && npm ci && npm test)
```

**Expect**: all pass, exactly as on `main`.
