# Research: Containerized Kanban App

**Feature**: `004-containerize-app` | **Date**: 2026-11-01 | **Plan**: [plan.md](plan.md)

Each item records the decision, why, and what else was considered. The installed Docker skills
(`docker-project-foundations`, `docker-build-strategies`, `docker-compose-patterns`,
`docker-destructive-guardrails`) were applied as the baseline; deviations from them are called out.

## R1. Orchestration and file layout

- **Decision**: Docker Compose v2 with one `compose.yaml` at the repo root (top-level
  `name: kanban`), one `Dockerfile` + `.dockerignore` inside each project (`backend/`, `frontend/`,
  `e2e/`), and a `compose.e2e.yaml` override for the E2E run. Minimum versions: Docker Engine **25**
  (needed for healthcheck `start-interval` / `start_interval`) / Docker Desktop 4.27, Compose
  **2.24** (needed for `!reset` in the override and
  `depends_on.restart`).
- **Rationale**: The skills call for `compose.yaml` (not the legacy name) at the root and a
  per-service Dockerfile in a multi-service layout. Keeping each Dockerfile next to its project
  means each build context is that project only, so `.dockerignore` stays short and nothing from
  sibling projects (or the root `.env`) can enter a context.
- **Alternatives**: a `docker/` folder with all Dockerfiles (context would have to be the repo
  root, so the root `.env` and both `node_modules` folders would be in every context); a
  `compose.override.yaml` for E2E (auto-loaded by Compose, so it would leak into every normal
  `up`).

## R2. Backend image (Python slim, multi-stage, uv, uvicorn)

- **Decision**: Two stages, both on the same pinned `python:3.12-slim` tag (bookworm/trixie, matched
  between stages):
  1. `build`: copy the pinned `uv` binary from the official `ghcr.io/astral-sh/uv:<version>` image;
     `uv sync --frozen --no-dev --no-install-project` with `pyproject.toml` and `uv.lock`
     bind-mounted and a cache mount on `/root/.cache/uv`; env `UV_COMPILE_BYTECODE=1`,
     `UV_LINK_MODE=copy`, `UV_PYTHON_DOWNLOADS=0` so the venv uses the image's own Python.
  2. `runtime`: create user/group `app` with fixed UID/GID `10001`; `COPY --link --chown=10001:10001`
     the venv (`/app/.venv`) and `app/` only; create `/data` owned by `10001`; `ENV
     PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1 DATABASE_URL=sqlite:////data/kanban.db
     CORS_ORIGINS= SEED_ON_STARTUP=true`; `USER 10001:10001`; `EXPOSE 8000`;
     `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` (exec form, no
     `--reload`, one worker).
- **Rationale**: `uv.lock` already pins every dependency; `--frozen` makes the image reproducible
  and fails the build if the lock is stale. Same base in both stages keeps the venv's interpreter
  symlink valid. No tests, `scripts/`, dev group, `.venv` or `kanban.db` from the checkout reach
  the image (FR-016). One worker is required: SQLite writes are serialized in-process with
  `BEGIN IMMEDIATE`, and the app is single-user.
- **Alternatives**: `pip install` from an exported requirements file (second source of truth for
  versions); `python:3.12-alpine` (musl wheels, slower builds, user asked for slim); distroless
  Python (no shell or Python-runnable healthcheck without a sidecar, more moving parts);
  `gunicorn` with uvicorn workers (multi-process is wrong for this SQLite design).

## R3. Backend healthcheck without curl

- **Decision**: Healthcheck in `compose.yaml` (and mirrored as `HEALTHCHECK` in the Dockerfile so the
  image is self-describing):
  `python -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/boards', timeout=2)"`;
  `interval: 5s`, `timeout: 3s`, `retries: 5`, `start_period: 15s` (`start_interval: 1s`).
- **Rationale**: The slim image has no curl/wget and adding one just for health is extra surface;
  Python is already there. `GET /api/v1/boards` touches the database, so "healthy" means "can
  serve real requests" (FR-005), not just "process is up". No dedicated `/health` endpoint, because
  that would change the OpenAPI contract (FR-021, Principle II).
- **Alternatives**: `/openapi.json` (does not touch the DB); a new `/healthz` route (contract change);
  installing curl; a sidecar (the skill's pattern for distroless images — not needed here).

## R4. Frontend image (Vite build in Node, served by nginx)

- **Decision**:
  1. `build` stage on a pinned `node:24-slim` (glibc): `npm ci` with `package.json` and
     `package-lock.json` bind-mounted and a cache mount on `/root/.npm`, then copy sources and run
     `npm run build` with `VITE_API_BASE_URL` set to the **empty string** as a fixed constant in the
     Dockerfile (not a build `ARG`).
  2. `runtime` stage on a pinned `nginxinc/nginx-unprivileged:<1.x>-alpine`: copy `dist/` and an nginx
     config template; runs as the image's built-in non-root `nginx` user (UID 101) and listens on
     **8080**.
- **Rationale**: `client.ts` builds URLs as `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1…`.
  `??` keeps an empty string, so building with `VITE_API_BASE_URL=""` makes every call a relative
  `/api/v1/...` request to the same origin, with **no frontend source change** and no
  environment-specific value in the image. Vite gives `process.env` priority over `.env*` files, and
  `.dockerignore` excludes `.env*` anyway, so a developer's local `frontend/.env` can never leak in.
  The non-container workflow keeps its default (`http://localhost:8000`) untouched (FR-019). The
  build stage still runs `tsc -b`, so type errors fail the image build. `node:*-slim` over alpine
  because Vite 8's native bundler bindings in the lockfile target glibc as well as musl, and glibc is
  the safer default for multi-arch `npm ci` (FR-018). `nginx-unprivileged` gives a non-root nginx
  without patching pid/cache paths (FR-017).
- **Verification hook**: the image build (or the smoke check) asserts that the built JS contains no
  `localhost:8000`, so a regression to an absolute URL is caught.
- **Alternatives**: change the client default to a relative path and add a Vite dev proxy (touches
  the dev workflow and Vite config for no gain); runtime `config.js` injection (needed only for
  cross-origin deployments, YAGNI); official `nginx` image running as root, or patching it to
  non-root; serving `dist/` from FastAPI (couples the two projects and breaks the "frontend is a
  static site" requirement).

## R5. nginx routing and same-origin API

- **Decision**: One `server` on port 8080:
  - `location /api/` → `proxy_pass` to the backend (request URI passed unchanged), with `Host`,
    `X-Forwarded-For`, `X-Forwarded-Proto` headers.
  - `location = /docs`, `location = /docs/oauth2-redirect`, `location = /openapi.json` → same
    backend proxy, so the API docs are served under the app's address (FR-002, Principle I).
  - `location /assets/` → static, `Cache-Control: public, max-age=31536000, immutable` (Vite hashes
    file names).
  - `location /` → `try_files $uri /index.html` (React Router client-side routes), `index.html`
    served with `Cache-Control: no-cache`.
  - `server_tokens off`, gzip for text types.
  - For `/api/` only, `502/503/504` are answered with the project's uniform JSON error body
    (`{"error":{"code":"service_unavailable","message":"The API is temporarily unavailable.","details":null}}`,
    `Content-Type: application/json`) so the frontend shows its normal error state instead of an
    nginx HTML page (Principle VII spirit).
  - The backend address is a template variable `BACKEND_UPSTREAM` (default `http://backend:8000`),
    filled by the image's built-in `envsubst` step at start (`/etc/nginx/templates/*.template`), so a
    deployment can point at another host without rebuilding (FR-014).
- **Rationale**: Same origin removes CORS from the default setup entirely (FR-015) and lets the
  frontend image be environment-agnostic. The backend gets no host port (FR-002).
- **Upstream re-resolution**: nginx resolves `backend` once at start. `depends_on.restart: true` on
  the frontend makes Compose restart it whenever the backend is recreated, so a stale IP is not
  possible in the Compose setup; no Docker-specific `resolver 127.0.0.11` is hard-coded.
- **Alternatives**: publishing the backend on its own port (rejected in clarification); Traefik/Caddy
  as a separate proxy service (one more container for the same job).

## R6. Data persistence

- **Decision**: Named volume `kanban-data` mounted at `/data` in the backend;
  `DATABASE_URL=sqlite:////data/kanban.db`. `/data` is created in the image owned by UID 10001, so
  Docker copies that ownership into a fresh named volume and the non-root process can write.
- **Rationale**: Named volumes survive `down`, container recreation and image rebuilds (FR-006); only
  `down -v` removes them (FR-003 reset). The volume lives inside Docker's storage, never in the
  checkout, so it can't collide with `backend/kanban.db` (FR-008). WAL + `synchronous=FULL` already
  configured in `db.py` give the same crash safety as the non-container setup; WAL is safe on a
  local named volume (it is not a network file system).
- **Alternatives**: bind mount `./data` (host permission/UID problems on Linux, and lives in the
  checkout); a separate database container (violates Principle III).

## R7. Configuration and `.env`

- **Decision**: Compose reads the root `.env` for **variable interpolation only**; no `env_file:` is
  used. Every Compose-level variable is prefixed `KANBAN_` and has a default via `${VAR:-default}`,
  so `docker compose up` works with no `.env` at all. The existing root `.env.example` gains a
  documented "Docker Compose" section (it stays the single versioned example; `.env` is already
  gitignored):

  | Variable | Default | Maps to |
  |---|---|---|
  | `KANBAN_PORT` | `8080` | host port of nginx |
  | `KANBAN_BIND_ADDRESS` | `127.0.0.1` | host interface; `0.0.0.0` opens it to the network (FR-004a) |
  | `KANBAN_SEED_ON_STARTUP` | `true` | backend `SEED_ON_STARTUP` |
  | `KANBAN_CORS_ORIGINS` | *(empty)* | backend `CORS_ORIGINS` |
  | `KANBAN_DATABASE_URL` | `sqlite:////data/kanban.db` | backend `DATABASE_URL` |
  | `KANBAN_BACKEND_UPSTREAM` | `http://backend:8000` | nginx `BACKEND_UPSTREAM` |

- **Rationale**: The root `.env` already holds a developer secret (`STITCH_API_KEY` for an MCP
  tool). `env_file: .env` would inject it into containers; interpolation only reads the names that
  `compose.yaml` references. The `KANBAN_` prefix stops variables a developer exported for the
  non-container backend (`DATABASE_URL`, `CORS_ORIGINS`) from silently reconfiguring the containers,
  since Compose also interpolates from the shell. Empty `CORS_ORIGINS` yields an empty allow-list
  (verified in `config.py`: blank entries are dropped, `*` is rejected), which is correct for
  same-origin (FR-015). "Public frontend/API addresses" from FR-014 need no variable: the frontend
  uses relative URLs, so the public address is whatever host/port serves nginx.
- **Alternatives**: per-project `.env.example` files for Docker (two places to look); `env_file:`
  (secret leakage, above); unprefixed names (shell collisions, above).

## R8. Single published port, loopback by default

- **Decision**: Only `frontend` has `ports:`
  `"${KANBAN_BIND_ADDRESS:-127.0.0.1}:${KANBAN_PORT:-8080}:8080"`. Backend uses `expose: ["8000"]`
  only. Default 8080 differs from the dev ports 8000/5173 so both setups can run side by side.
- **Rationale**: FR-002, FR-004, FR-004a and the skill rule "bind published ports to loopback by
  default". A taken port makes `up` fail with Docker's "port is already allocated / address already in
  use" error naming the port; the README tells the user to set `KANBAN_PORT`.

## R9. Startup ordering and health of the frontend

- **Decision**: `frontend.depends_on.backend: { condition: service_healthy, restart: true }`.
  Frontend healthcheck: `wget -q -O /dev/null http://127.0.0.1:8080/api/v1/boards` (busybox `wget`
  ships in the alpine image), same timings as R3.
- **Rationale**: Probing *through* nginx proves static serving, proxying and backend readiness in one
  check, so the frontend can never report healthy before the backend can serve (FR-005, User Story 4
  scenario 3). `docker compose up -d --wait` then returns only when the app is usable.
- **Restart policy**: `restart: unless-stopped` on both services (skill guidance for non-dev stacks):
  the app comes back after a Docker/host restart, and `docker compose stop`/`down` still stop it.

## R10. E2E against the containers, runner in a container

- **Decision**:
  - `e2e/Dockerfile` on `mcr.microsoft.com/playwright:v1.64.1-noble` — the tag **must equal** the
    `@playwright/test` version in `e2e/package-lock.json` (1.64.1) so the bundled Chromium matches;
    `npm ci` (manifests bind-mounted), copy `playwright.config.js`, `global-setup.js`, `support/`,
    `tests/`; `USER pwuser`; `CMD ["npx", "playwright", "test"]`. Multi-arch (amd64/arm64).
  - `compose.e2e.yaml` (override, used only together with `compose.yaml`):
    - `backend.environment.SEED_ON_STARTUP: "false"` (unseeded, as in managed mode);
    - `frontend.ports: !reset []` — no host port, so it never conflicts with the user's running app;
    - new `e2e` service: `BASE_URL=http://frontend:8080`, `API_URL=http://frontend:8080` (the API is
      same-origin behind nginx), `CI=1` (enforces `forbidOnly`), `depends_on.frontend:
      service_healthy`, `ipc: host`/`init: true` as Playwright recommends for Chromium in Docker.
  - Isolation comes from a **separate Compose project name** `kanban-e2e`: its containers, network
    and volume (`kanban-e2e_kanban-data`) are distinct from the user's `kanban` project, so the run
    never touches the user's app or data (FR-010) and `down -v` on it is safe.
  - One command: `scripts/e2e-docker.sh` — builds, `docker compose -p kanban-e2e … run --name
    kanban-e2e-runner e2e` (Compose starts and waits for the healthy app first), copies
    `test-results/` and `playwright-report/` out of the stopped runner into `e2e/` with `docker cp`,
    then in a `trap` always runs `docker compose -p kanban-e2e … down -v --remove-orphans` and removes
    the runner container; exits with the runner's exit code (FR-009, FR-011).
- **Rationale**: Uses the suite's existing **external mode** unchanged (`BASE_URL` + `API_URL`), so
  zero test edits (SC-004) and the host-based managed/external modes keep working (FR-012). Copying
  artifacts out with `docker cp` instead of a bind mount avoids host UID/permission problems on Linux
  and keeps evidence at the same paths as a host run (both gitignored).
- **Guardrails**: `down -v` is destructive; it is acceptable here only because the project name is
  hard-coded to the throwaway `kanban-e2e` project (never the user's `kanban` project), which the
  script documents. Images are not removed, so later runs are fast.
- **Alternatives**: `up --abort-on-container-exit --exit-code-from e2e` (works, but app logs flood the
  output and artifact copy still needs a second step); bind-mounting result folders (UID issues);
  running Playwright on the host against `localhost:8080` (needs Node + browser on the host — still
  documented as an option, see quickstart, but not the one-command path); a Makefile (`make` is not
  guaranteed on all hosts, a POSIX shell is on macOS/Linux/WSL).

## R11. Host-based E2E against the Compose app (`BASE_URL` pointing at Compose)

- **Decision**: Document, without code changes, that the existing external mode works against any
  Compose-started app: `BASE_URL=http://localhost:<port> API_URL=http://localhost:<port> npm test`.
  For isolation the quickstart shows doing it against a **separate** throwaway project
  (`KANBAN_PORT=8081 KANBAN_SEED_ON_STARTUP=false docker compose -p kanban-e2e up -d --wait`), not the
  user's own app, consistent with Principle IV (isolated DB unless a dedicated test environment).
- **Rationale**: Satisfies "the e2e suite must be able to run with BASE_URL pointing to the app in
  Compose" both from the container (R10) and from the host.

## R12. `.dockerignore` per project

- **Decision**: Allow-list style is not used (it breaks too easily); each project gets a deny list:
  - all: `.git`, `**/.DS_Store`, `**/.env`, `**/.env.*` (including `.env.example`, which images
    don't need), `**/.npmrc`, `*.pem`, `Dockerfile`, `.dockerignore`, `*.md`.
  - `backend/`: `.venv/`, `**/__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `kanban.db*`, `tests/`,
    `scripts/`.
  - `frontend/`: `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `*.local`.
  - `e2e/`: `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`.
- **Rationale**: FR-016 and the "stale local files" edge case; credentials excluded as defence in
  depth (skill guidance). Frontend test files stay in the *build* context because `tsc -b` type-checks
  them, but only `dist/` reaches the final image.

## R13. Multi-architecture

- **Decision**: All base images used (`python:3.12-slim`, `ghcr.io/astral-sh/uv`, `node:24-slim`,
  `nginxinc/nginx-unprivileged:*-alpine`, `mcr.microsoft.com/playwright:*-noble`) publish
  `linux/amd64` and `linux/arm64`. Images are built locally for the host's native platform; no
  `platform:` is pinned in Compose.
- **Rationale**: FR-018 for Intel and Apple Silicon without emulation. Publishing multi-arch images to
  a registry (`buildx --platform`) belongs to the later deployment feature.

## R14. Verification approach (Principle IV for infrastructure)

- **Decision**: No backend or frontend code changes, so no new pytest/Vitest tests are needed and the
  existing suites guard FR-019/FR-021. The containerized behaviour is verified by:
  1. `scripts/e2e-docker.sh` (the existing E2E suite run inside Compose) — US1/US3 behaviour;
  2. a new `scripts/docker-smoke.sh` written **before** the Docker files and seen to fail first. It
     uses its own Compose project name (`kanban-smoke`) and port, and asserts: both services
     healthy; `/`, a deep link, `/api/v1/boards`, `/docs` and `/openapi.json` answer on the single
     port; the backend has no published port; the port is bound to `127.0.0.1` only; the sample
     board appears exactly once across 3 `down`/`up` cycles and a created ticket + comment survive
     them and a rebuild (US2, SC-003); seeding off yields zero boards; images run as non-root and
     contain no `tests/`, `kanban.db`, `node_modules`, `.env` (FR-016/017); the frontend bundle has no
     `localhost:8000`. It always tears its own project down with `down -v`.
- **Rationale**: Gives each container requirement an executable check that fails before
  implementation, matching the intent of Principle IV, without introducing a new test framework.
- **Alternatives**: container-structure-test / Testcontainers / bats (new dependencies, rejected
  under Principle V).

## Open items

None. All Technical Context unknowns are resolved above. Exact patch tags/digests for base images and
the `uv` version are pinned at implementation time to the latest releases of the chosen lines.
