---

description: "Task list for 004-containerize-app"
---

# Tasks: Containerized Kanban App

**Input**: Design documents from `/specs/004-containerize-app/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R14), data-model.md, contracts/run-interface.md, contracts/http-routing.md, quickstart.md

**Tests**: Requested. The plan (Constitution Principle IV, research R14) requires executable container checks written **before** the Docker files and seen to fail: `scripts/docker-smoke.sh` (container checks) and `scripts/e2e-docker.sh` (existing E2E suite in Compose). No new pytest/Vitest tests: backend, frontend and E2E source code MUST NOT change (FR-021, SC-004).

**Organization**: Tasks are grouped by user story so each story can be implemented and verified on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US5)

## Path Conventions

Existing monorepo: `backend/`, `frontend/`, `e2e/` plus root-level `compose.yaml`, `compose.e2e.yaml`, `scripts/`. All paths below are relative to the repository root.

## Global rules for every task

- Do NOT edit anything under `backend/app/`, `backend/tests/`, `frontend/src/`, `frontend/vite.config.ts`, `e2e/tests/`, `e2e/support/`, `e2e/playwright.config.js` or `e2e/global-setup.js`.
- Never run `docker compose down -v`, `docker volume rm` or any `prune` command against project `kanban` (the user's own data). `down -v` is allowed only on the hard-coded throwaway projects `kanban-e2e`, `kanban-smoke` and `kanban-alt` (docker-destructive-guardrails skill).
- Dockerfiles follow the docker-build-strategies skill: `# syntax=docker/dockerfile:1`, named stages, `WORKDIR` first, bind-mounted manifests + cache mounts, `COPY --link --chown=<uid>:<gid>`, `USER` after file operations, exec-form `CMD`, `EXPOSE`, OCI `LABEL`s.
- Compose follows the docker-compose-patterns skill: no `env_file:`, `${VAR:-default}` for every setting, healthchecks on both services, `depends_on` with `service_healthy`, top-level named volume, `restart: unless-stopped`.
- All new files and docs in English. Scripts are POSIX `sh` (`#!/bin/sh`, `set -eu`), executable (`chmod +x`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pin versions and keep checkouts' local files out of every build context.

- [X] T001 Resolve and record the exact pinned tags for every base image in a "Pinned versions" list at the end of `specs/004-containerize-app/research.md`: latest `python:3.12.x-slim-<debian>` patch tag, latest `ghcr.io/astral-sh/uv:<x.y.z>` release, latest `node:24.x-slim` tag (same Debian release as Python where possible), latest `nginxinc/nginx-unprivileged:1.<stable>-alpine` tag, and `mcr.microsoft.com/playwright:v<version>-noble` where `<version>` MUST equal the `@playwright/test` version resolved in `e2e/package-lock.json` (currently 1.64.1 — read `node_modules/@playwright/test` `version` in the lockfile, not the `^` range in `package.json`). Confirm each tag publishes `linux/amd64` and `linux/arm64` (`docker buildx imagetools inspect <image>`) (FR-018, R13).
- [X] T002 Create the `scripts/` directory at the repository root (it does not exist yet) with no other content.
- [X] T003 [P] Create `backend/.dockerignore` (deny list, R12): `.git`, `**/.DS_Store`, `**/.env`, `**/.env.*`, `**/.npmrc`, `*.pem`, `Dockerfile`, `.dockerignore`, `*.md`, `.venv/`, `**/__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `kanban.db*`, `tests/`, `scripts/` (FR-016).
- [X] T004 [P] Create `frontend/.dockerignore` (deny list, R12): `.git`, `**/.DS_Store`, `**/.env`, `**/.env.*` (also excludes `frontend/.env.example`), `**/.npmrc`, `*.pem`, `Dockerfile`, `.dockerignore`, `*.md`, `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `*.local`. Do NOT exclude `src/**/*.test.*` — `tsc -b` in `npm run build` type-checks them; only `dist/` reaches the final image.
- [X] T005 [P] Create `e2e/.dockerignore` (deny list, R12): `.git`, `**/.DS_Store`, `**/.env`, `**/.env.*`, `**/.npmrc`, `*.pem`, `Dockerfile`, `.dockerignore`, `*.md`, `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`, `playwright/.auth/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The smoke-check harness every story adds checks to. Written first (Principle IV).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Create the harness of `scripts/docker-smoke.sh` (`#!/bin/sh`, `set -eu`, executable): `cd` to the repo root (directory of the script's parent); hard-code `PROJECT=kanban-smoke`, `export KANBAN_PORT=${SMOKE_PORT:-8089}` and `export KANBAN_IMAGE_TAG=smoke` (so the script builds `kanban-*:smoke` and never retags the user's `kanban-*:local` images, FR-010); define `compose() { docker compose -p "$PROJECT" "$@"; }`; define helpers `pass NAME`, `fail NAME MESSAGE` (records failure, continues), `http_status URL` and `http_body URL` (via `curl -s`), `wait_up` (`compose up -d --wait`), `health SERVICE` (`docker inspect -f '{{.State.Health.Status}}' "$(compose ps -q SERVICE)"` — Go template, no JSON parsing), and `json_get PY_EXPR` that reads JSON on stdin and prints the Python expression evaluated against it as `d` (`docker run --rm -i --entrypoint python "kanban-backend:$KANBAN_IMAGE_TAG" -c 'import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1]))' "$1"`). The host needs no `jq` or Python: all JSON (API responses, `compose config --format json`) is parsed with `json_get` inside the already-built backend image, and container state is read with Go templates; a `cleanup` function registered with `trap cleanup EXIT INT TERM` that runs `compose down -v --remove-orphans` (comment: "destructive, but only on the throwaway kanban-smoke project"); print a summary and exit 1 if any check failed, else 0. Check sections are empty functions `check_us1`, `check_us2`, `check_us4` called in that order after `compose up -d --build --wait`; a failing `up` must exit non-zero with a clear message. Document at the top of the file that it requires only Docker + curl and never touches project `kanban`.
- [X] T007 Run `scripts/docker-smoke.sh` and confirm it fails because `compose.yaml` does not exist yet (expected red state). Record nothing in the repo.

**Checkpoint**: Harness exists and fails for the right reason. User stories can start.

---

## Phase 3: User Story 1 - Start the whole app with one command (Priority: P1) 🎯 MVP

**Goal**: `docker compose up -d --build --wait` from the repo root starts backend + frontend; the board, API and API docs are served from `http://localhost:8080` only; `docker compose down` stops everything.

**Independent Test**: On a machine with only Docker, run `docker compose up -d --build --wait`, open http://localhost:8080, see "Sample Project" once, create a ticket and move it; `curl localhost:8000` fails; `docker compose down` frees port 8080 (quickstart §1, §2).

### Tests for User Story 1 ⚠️ (write first, see them fail)

- [X] T008 [US1] Implement `check_us1` in `scripts/docker-smoke.sh`: (a) `health backend` and `health frontend` both print `healthy`; (b) `GET /` returns 200 and HTML containing `<div id="root"`; (c) deep link `GET /boards/1` returns 200 HTML (SPA fallback) with header `Cache-Control: no-cache`; (d) `GET /api/v1/boards` returns 200 and a JSON array containing exactly one board named `Sample Project`; (e) `GET /docs` returns 200 and contains `swagger-ui`; (f) `GET /openapi.json` returns 200 JSON with `"openapi"`; (g) `compose port backend 8000` prints nothing / fails (backend not published, FR-002); (h) `compose port frontend 8080` prints `127.0.0.1:<KANBAN_PORT>` (loopback only, FR-004a); (i) `GET /api/v1/does-not-exist` returns the backend's uniform JSON error (proves proxying, not nginx 404 HTML); (j) the `Server` response header has no nginx version (`server_tokens off`); (k) `GET /assets/<first file referenced in index.html>` returns 200 with `Cache-Control` containing `immutable`. Routes and headers per `contracts/http-routing.md`.
  Hardening checks, also written here — before T010–T013 implement them (Principle IV):
  (l) non-root — `compose exec backend id -u` prints `10001`, `compose exec frontend id -u` prints `101` (FR-017);
  (m) image hygiene — `docker run --rm --entrypoint sh kanban-backend:$KANBAN_IMAGE_TAG -c 'test ! -e /app/tests && test ! -e /app/scripts && ! ls /app/kanban.db* 2>/dev/null && test ! -e /app/.env'`; `pytest` and `ruff` are not importable in the backend image; for `kanban-frontend:$KANBAN_IMAGE_TAG`: no `node_modules`, no `.env*`, and `! grep -rq "localhost:8000" /usr/share/nginx/html` (FR-016);
  (n) production mode — `compose exec backend cat /proc/1/cmdline` has no `--reload` (FR-013);
  (o) health ordering — `compose config --format json | json_get "d['services']['frontend']['depends_on']['backend']['condition']"` prints `service_healthy`, and `json_get` confirms both services define a `healthcheck` (FR-005);
  (p) network setting — `KANBAN_BIND_ADDRESS=0.0.0.0 compose config --format json | json_get "d['services']['frontend']['ports'][0]['host_ip']"` prints `0.0.0.0`, while the default prints `127.0.0.1` (FR-004a; config only, nothing is opened to the network);
  (q) API down — run last in `check_us1`: `compose stop backend`, assert `GET /api/v1/boards` through nginx returns 502/503/504 with `Content-Type: application/json` and a body containing `"service_unavailable"` (Principle VII), then `compose up -d --wait` to restore the stack for `check_us2`.
- [X] T009 [US1] Run `scripts/docker-smoke.sh` and confirm it still fails (no Dockerfiles/compose yet).

### Implementation for User Story 1

- [X] T010 [P] [US1] Create `backend/Dockerfile` (R2) with stages `build` and `runtime`, both `FROM` the pinned `python:3.12-slim` tag from T001. `build`: `WORKDIR /app`; `COPY --from=ghcr.io/astral-sh/uv:<pinned> /uv /uvx /bin/`; `ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0`; `RUN --mount=type=cache,target=/root/.cache/uv --mount=type=bind,source=pyproject.toml,target=pyproject.toml --mount=type=bind,source=uv.lock,target=uv.lock uv sync --frozen --no-dev --no-install-project`. `runtime`: `WORKDIR /app`; create group/user `app` with fixed UID/GID `10001` (no login shell, no home files); `mkdir /data && chown 10001:10001 /data`; `COPY --link --chown=10001:10001 --from=build /app/.venv /app/.venv`; `COPY --link --chown=10001:10001 app/ /app/app/`; `ENV PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1 DATABASE_URL=sqlite:////data/kanban.db CORS_ORIGINS= SEED_ON_STARTUP=true`; `USER 10001:10001`; `EXPOSE 8000`; `HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=15s --start-interval=1s CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/boards', timeout=2)"]` (R3); `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` (no `--reload`, one worker). Add OCI labels `org.opencontainers.image.title="kanban-backend"`, `.description`, `.source`. Verify with `docker build -t kanban-backend:check backend` that the build succeeds and fails if `uv.lock` is stale (`--frozen`).
- [X] T011 [P] [US1] Create `frontend/nginx/default.conf.template` (R5, `contracts/http-routing.md`): one `server` with `listen 8080;`, `server_tokens off;`, `root /usr/share/nginx/html;`, gzip on for `text/css application/javascript application/json image/svg+xml`. Locations: `location /api/ { proxy_pass ${BACKEND_UPSTREAM}; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; proxy_intercept_errors off; error_page 502 503 504 = @api_unavailable; }` (no trailing path on `proxy_pass` so the URI is passed unchanged); `location @api_unavailable { default_type application/json; return 503 '{"error":{"code":"service_unavailable","message":"The API is temporarily unavailable.","details":null}}'; }`; `location = /docs`, `location = /docs/oauth2-redirect`, `location = /openapi.json` → same `proxy_pass ${BACKEND_UPSTREAM};` and headers; `location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }`; `location / { try_files $uri /index.html; }` plus `location = /index.html { add_header Cache-Control "no-cache"; }`. Keep request body size at nginx's default 1 MiB. Only `${BACKEND_UPSTREAM}` may be substituted — every other `$` is an nginx variable (set `NGINX_ENVSUBST_FILTER=BACKEND_UPSTREAM` in T012 so `envsubst` leaves them alone).
- [X] T012 [US1] Create `frontend/Dockerfile` (R4) with stages `build` and `runtime`. `build`: `FROM` pinned `node:24-slim`; `WORKDIR /app`; `RUN --mount=type=cache,target=/root/.npm --mount=type=bind,source=package.json,target=package.json --mount=type=bind,source=package-lock.json,target=package-lock.json npm ci`; `COPY . .`; `ENV VITE_API_BASE_URL=""` (fixed constant, NOT a build `ARG` — `client.ts` uses `??`, so an empty string yields relative `/api/v1/...` URLs); `RUN npm run build` (runs `tsc -b`, so type errors fail the image); then `RUN ! grep -rq "localhost:8000" dist/` so an absolute API URL fails the build (R4 verification hook). `runtime`: `FROM` pinned `nginxinc/nginx-unprivileged:<1.x>-alpine`; `COPY --link --chown=101:101 --from=build /app/dist /usr/share/nginx/html`; `COPY --link nginx/default.conf.template /etc/nginx/templates/default.conf.template`; `ENV BACKEND_UPSTREAM=http://backend:8000 NGINX_ENVSUBST_FILTER=BACKEND_UPSTREAM`; `USER 101`; `EXPOSE 8080`; `HEALTHCHECK --interval=5s --timeout=3s --retries=5 --start-period=15s --start-interval=1s CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/api/v1/boards"]` (R9). OCI labels `org.opencontainers.image.title="kanban-frontend"`, `.description`, `.source`. Depends on T011.
- [X] T013 [US1] Create `compose.yaml` at the repo root (R1, R7–R9): top-level `name: kanban`. Service `backend`: `build: { context: ./backend, target: runtime }`, `image: kanban-backend:${KANBAN_IMAGE_TAG:-local}`, `expose: ["8000"]` (NO `ports:`), no `environment:` yet (seeding, data location and CORS are wired in T016 and T026 so their checks are red first), `healthcheck` (same command and timings as the backend `HEALTHCHECK` in T010), `restart: unless-stopped`. Service `frontend`: `build: { context: ./frontend, target: runtime }`, `image: kanban-frontend:${KANBAN_IMAGE_TAG:-local}`, `ports: ["${KANBAN_BIND_ADDRESS:-127.0.0.1}:${KANBAN_PORT:-8080}:8080"]`, `depends_on: { backend: { condition: service_healthy, restart: true } }`, `healthcheck` (same `wget` command and timings as T012), `restart: unless-stopped`. No `env_file:`, no `platform:`, default network only. Header comment: start `docker compose up -d --build --wait`, stop `docker compose down`, reset `docker compose down -v` (DESTRUCTIVE).
- [X] T014 [US1] Run `docker compose config` (validates interpolation with no `.env`), then `scripts/docker-smoke.sh` until every `check_us1` check passes. Then prove each hardening check (l)–(q) can fail (Principle IV): break the matching file temporarily — remove `USER` from `backend/Dockerfile` (l), remove `tests/` from `backend/.dockerignore` AND add `COPY --link tests/ /app/tests/` to the backend `runtime` stage (m) — removing the `.dockerignore` line alone does not make (m) fail, because the runtime stage copies only `app/`; the `.dockerignore` entry is defense-in-depth that (m) cannot detect on its own, add `--reload` to the backend `CMD` (n), change the `depends_on` condition to `service_started` (o), hard-code `127.0.0.1` in the frontend `ports:` (p), remove `error_page` from the nginx template (q) — run the script, see exactly that check fail, revert, and see it pass again. Do not commit the broken variants. Then manually: `docker compose up -d --build --wait`, open http://localhost:8080, create, move, edit and comment on a ticket with the browser console free of CORS/network errors (acceptance scenario 3); `docker compose down` and confirm nothing listens on 8080 (`curl localhost:8080` fails).

**Checkpoint**: MVP — the full app runs with one command and only Docker.

---

## Phase 4: User Story 2 - Data survives restarts (Priority: P1)

**Goal**: Boards, tickets, comments and history persist across `down`/`up`, host restarts and image rebuilds in the named volume `kanban-data`; only `docker compose down -v` deletes them.

**Independent Test**: Create a ticket with a unique title and a comment, `docker compose down && docker compose up -d --wait` three times and once with `--build`; the ticket, comment and history remain and "Sample Project" appears once (quickstart §3, §4).

### Tests for User Story 2 ⚠️ (write first, see them fail)

- [X] T015 [US2] Implement `check_us2` in `scripts/docker-smoke.sh` using only the HTTP API on the smoke port: read the sample board id (and its first column id) from the API with `json_get`, create a ticket titled `persist-check-<timestamp>` in its first column and add a comment (request shapes from `specs/001-kanban-ticketing/contracts/openapi.json`); then 3 times run `compose down` (WITHOUT `-v`) and `compose up -d --wait`, once `compose up -d --build --wait`, and once an unexpected stop — `compose kill backend` (SIGKILL, no clean shutdown) then `compose up -d --wait` (spec edge case "Unexpected stop"); after each cycle assert the ticket exists, its comment exists, `GET` its history is non-empty, and boards named `Sample Project` count exactly 1 (SC-003, FR-006, FR-007). Then assert `docker volume ls --format '{{.Name}}'` contains `kanban-smoke_kanban-data`. Finally check reset (US2 scenario 4, FR-003) on the throwaway project only: `compose down -v` then `compose up -d --wait`; assert exactly one `Sample Project` and no `persist-check-*` ticket. Run the script and confirm `check_us2` fails (data lost on `down` because there is no volume yet).

### Implementation for User Story 2

- [X] T016 [US2] Edit `compose.yaml`: declare top-level `volumes: { kanban-data: {} }`; mount it in `backend` with `volumes: ["kanban-data:/data"]`; add `DATABASE_URL: "${KANBAN_DATABASE_URL:-sqlite:////data/kanban.db}"` to `backend.environment` (R6). Do not add a bind mount (`./data`) and do not reference `backend/kanban.db` (FR-008).
- [X] T017 [US2] Run `scripts/docker-smoke.sh` until `check_us1` and `check_us2` pass. Then confirm FR-008 by hand: note the mtime/size of `backend/kanban.db`, run a container start/stop cycle, and verify the file is unchanged.

**Checkpoint**: US1 + US2 work — the containerized app is usable beyond a demo.

---

## Phase 5: User Story 3 - Run the existing E2E suite against the containerized app (Priority: P2)

**Goal**: `scripts/e2e-docker.sh` runs the unchanged Playwright suite in a container against an isolated, unseeded Compose project `kanban-e2e`, copies failure evidence to `e2e/`, always tears down, and exits with Playwright's exit code.

**Independent Test**: With the user's own `kanban` app running with data, run `scripts/e2e-docker.sh`; it exits 0, the user's app and data are unchanged, `docker compose -p kanban-e2e ps -a` is empty and no `kanban-e2e_*` volume remains (quickstart §6).

### Tests for User Story 3 ⚠️ (write first, see them fail)

- [X] T018 [P] [US3] Create `compose.e2e.yaml` (override, used only as `-f compose.yaml -f compose.e2e.yaml`, never auto-loaded) per R10: `backend.environment.SEED_ON_STARTUP: "false"`; `frontend.ports: !reset []` (no host port); new service `e2e` with `build: { context: ./e2e }`, `image: kanban-e2e:${KANBAN_IMAGE_TAG:-local}`, `environment: { BASE_URL: "http://frontend:8080", API_URL: "http://frontend:8080", CI: "1" }`, `depends_on: { frontend: { condition: service_healthy } }`, `ipc: host`, `init: true`, `restart: "no"`. Header comment: requires Compose ≥ 2.24 (`!reset`) and must be used with a throwaway project name.
- [X] T019 [P] [US3] Create `scripts/e2e-docker.sh` (`#!/bin/sh`, `set -eu`, executable) per `contracts/run-interface.md`: `cd` to the repo root; hard-code `PROJECT=kanban-e2e`, `RUNNER=kanban-e2e-runner` and `export KANBAN_IMAGE_TAG=e2e` (never retag the user's `kanban-*:local` images, FR-010); `compose() { docker compose -p "$PROJECT" -f compose.yaml -f compose.e2e.yaml "$@"; }`; `cleanup()` registered with `trap cleanup EXIT INT TERM` that runs `docker rm -f "$RUNNER" >/dev/null 2>&1 || true` and `compose down -v --remove-orphans` (comment: destructive only on the throwaway `kanban-e2e` project, never `kanban`); remove any leftover runner first; `compose build`; `compose run --name "$RUNNER" e2e npx playwright test "$@"` capturing its exit code without letting `set -e` abort (`status=0; compose run … || status=$?`); then replace `e2e/test-results` and `e2e/playwright-report` on the host (`rm -rf` both, then `docker cp "$RUNNER":/e2e/test-results e2e/` and `docker cp "$RUNNER":/e2e/playwright-report e2e/`, each `|| true` when absent); print where the evidence is; `exit "$status"`. A build or startup failure must exit non-zero before any check runs.
- [X] T020 [US3] Run `scripts/e2e-docker.sh` and confirm it fails because `e2e/Dockerfile` does not exist (expected red), and that cleanup still ran (`docker compose -p kanban-e2e ps -a` empty, no `kanban-e2e_kanban-data` volume).

### Implementation for User Story 3

- [X] T021 [US3] Create `e2e/Dockerfile` (R10): `# syntax=docker/dockerfile:1`; `FROM mcr.microsoft.com/playwright:v<version>-noble` with `<version>` exactly equal to the locked `@playwright/test` version from T001 (comment explaining the coupling); `WORKDIR /e2e`; `RUN --mount=type=cache,target=/root/.npm --mount=type=bind,source=package.json,target=package.json --mount=type=bind,source=package-lock.json,target=package-lock.json npm ci`; `COPY --link package.json package-lock.json playwright.config.js global-setup.js ./`; `COPY --link support/ ./support/`; `COPY --link tests/ ./tests/`; `RUN chown -R pwuser:pwuser /e2e`; `USER pwuser`; `CMD ["npx", "playwright", "test"]`. Must not download browsers (they ship in the image). OCI labels `org.opencontainers.image.title="kanban-e2e"`. Read `e2e/playwright.config.js` and `e2e/global-setup.js` first to confirm external mode is selected by `BASE_URL`/`API_URL` and that output dirs are `test-results/` and `playwright-report/` relative to `/e2e`; adjust only the Dockerfile/override, never those files.
- [X] T022 [US3] Start the user's app (`docker compose up -d --wait`), create a ticket in it, then run `scripts/e2e-docker.sh` until it exits 0 with every existing check passing (SC-004). Afterwards verify: the user's `kanban` app is still running and the ticket is still there, and the image IDs of `kanban-backend:local` and `kanban-frontend:local` (`docker image inspect -f '{{.Id}}'`, noted before the run) are unchanged (FR-010); `docker compose -p kanban-e2e ps -a` is empty; `docker volume ls | grep kanban-e2e` is empty (acceptance scenario 4); `e2e/playwright-report/index.html` exists on the host.
- [X] T023 [US3] Verify failure evidence (acceptance scenario 3): temporarily change one expectation in an `e2e/tests/*.spec.js` file, run `scripts/e2e-docker.sh`, confirm a non-zero exit, `e2e/test-results/<check>/trace.zip` and a screenshot on the host, and no retries in the output; then revert the spec file with `git checkout -- e2e/tests/` and confirm `git status e2e/tests` is clean.
- [X] T024 [US3] Verify argument pass-through and `forbidOnly` (FR-011): (a) `scripts/e2e-docker.sh tests/<one existing spec>.spec.js` runs only that file and exits 0; (b) temporarily change one `test(` to `test.only(` in an `e2e/tests/*.spec.js` file, run `scripts/e2e-docker.sh`, confirm it exits non-zero with Playwright's focused-test error (`CI=1` → `forbidOnly`), then revert with `git checkout -- e2e/tests/` and confirm `git status e2e/tests` is clean.

**Checkpoint**: The containerized app is proven equivalent to the non-container app by the existing suite.

---

## Phase 6: User Story 4 - A deployable, production-like build (Priority: P3)

**Goal**: The same images run with every environment-specific setting supplied from outside (`KANBAN_*`), in production mode, non-root, free of dev files, with health ordering guaranteed.

**Independent Test**: Without rebuilding, start the images as project `kanban-alt` with `KANBAN_PORT=8090 KANBAN_SEED_ON_STARTUP=false KANBAN_CORS_ORIGINS=https://example.test`; port 8090 serves the app, boards list is `[]`, the origin is allowed (quickstart §5).

### Tests for User Story 4 ⚠️ (write first, see them fail)

- [X] T025 [US4] Implement `check_us4` in `scripts/docker-smoke.sh` (settings only — the hardening checks already live in `check_us1`, T008 (l)–(q)): run `compose down` (no `-v`), then start a second throwaway project `kanban-alt` with `KANBAN_PORT=$((KANBAN_PORT+1)) KANBAN_SEED_ON_STARTUP=false KANBAN_CORS_ORIGINS=https://example.test docker compose -p kanban-alt up -d --wait` (no `--build`; `KANBAN_IMAGE_TAG=smoke` is inherited so it reuses the smoke images; extend `cleanup` to also run `docker compose -p kanban-alt down -v --remove-orphans`); assert the app answers on the new port (US4 scenario 2); `GET /api/v1/boards` on that port returns `[]` (FR-007, US4 scenario 1); an `OPTIONS /api/v1/boards` preflight with `Origin: https://example.test` and `Access-Control-Request-Method: POST` returns `access-control-allow-origin: https://example.test`, while `Origin: https://evil.test` gets no such header (FR-015); no image was rebuilt (`docker image inspect -f '{{.Id}}'` of `kanban-backend:smoke` and `kanban-frontend:smoke` unchanged before/after, SC-006). Run the script and confirm `check_us4` fails on the seeding and CORS assertions (neither is wired into `compose.yaml` until T026).

### Implementation for User Story 4

- [X] T026 [US4] Edit `compose.yaml` to expose the remaining settings (R7): add to `backend.environment` `SEED_ON_STARTUP: "${KANBAN_SEED_ON_STARTUP:-true}"` and `CORS_ORIGINS: "${KANBAN_CORS_ORIGINS:-}"`; add to `frontend` `environment: { BACKEND_UPSTREAM: "${KANBAN_BACKEND_UPSTREAM:-http://backend:8000}" }`. Confirm every value in the compose file uses `${KANBAN_*:-default}` and the defaults exactly match the table in `contracts/run-interface.md` (`KANBAN_PORT`=`8080`, `KANBAN_BIND_ADDRESS`=`127.0.0.1`, `KANBAN_SEED_ON_STARTUP`=`true`, `KANBAN_CORS_ORIGINS`=empty, `KANBAN_DATABASE_URL`=`sqlite:////data/kanban.db`, `KANBAN_BACKEND_UPSTREAM`=`http://backend:8000`, `KANBAN_IMAGE_TAG`=`local`).
- [X] T027 [P] [US4] Edit root `.env.example`: keep `STITCH_API_KEY=` unchanged and append a commented "Docker Compose (optional)" section listing every `KANBAN_*` variable from `contracts/run-interface.md` with its default commented out (e.g. `# KANBAN_PORT=8080`) and a one-line explanation each; state that Compose reads `.env` for interpolation only and never passes it into containers, and that `KANBAN_BIND_ADDRESS=0.0.0.0` exposes an app with no login to the network.
- [X] T028 [US4] Fix any gaps found by `check_us4` in `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx/default.conf.template`, the three `.dockerignore` files or `compose.yaml`, then run `scripts/docker-smoke.sh` until all of `check_us1`, `check_us2`, `check_us4` pass and the script exits 0.

**Checkpoint**: Images are deploy-ready and configured only from outside.

---

## Phase 7: User Story 5 - The non-container workflow keeps working (Priority: P1)

**Goal**: Every existing non-container command behaves exactly as on `main`; containers stay optional (Principle V).

**Independent Test**: With Docker stopped, the backend, frontend and E2E README commands all work and every suite passes (quickstart §8).

> US5 is a regression guard, so it runs after the files above exist. Its checks are the existing suites; no new tests.

- [X] T029 [US5] Verify no forbidden file changed: `git diff --stat main -- backend/app backend/tests backend/pyproject.toml backend/uv.lock frontend/src frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig*.json e2e/tests e2e/support e2e/playwright.config.js e2e/global-setup.js e2e/package.json e2e/package-lock.json specs/001-kanban-ticketing/contracts` prints nothing (FR-019, FR-021). If anything is listed, revert it.
- [X] T030 [P] [US5] With Docker Desktop/daemon stopped, run the backend workflow from `backend/README.md`: `cd backend && uv sync && uv run pytest && uv run ruff check . && uv run ruff format --check .`; then `uv run uvicorn app.main:app --reload` and confirm `GET http://localhost:8000/api/v1/boards` works and uses `backend/kanban.db` (US5 scenario 2).
- [X] T031 [P] [US5] With Docker stopped, run the frontend workflow from `frontend/README.md`: `cd frontend && npm ci && npm test && npm run typecheck && npm run lint && npm run build`; confirm the host build still contains `localhost:8000` as the default API base (`grep -rq "localhost:8000" dist/`), proving the dev default is untouched.
- [X] T032 [US5] With Docker stopped, run the E2E suite in managed mode (`cd e2e && npm ci && npm test`) and in external mode against a host-run backend + frontend as documented in `e2e/README.md`; all checks pass.
- [X] T033 [P] [US5] Edit `backend/README.md`: add a short "Running in Docker (optional)" note pointing to the root README, stating that the container uses its own database in the `kanban-data` volume (never `backend/kanban.db`), that the image sets `DATABASE_URL`, `CORS_ORIGINS` (empty) and `SEED_ON_STARTUP`, and that every command in this README is unchanged.
- [X] T034 [P] [US5] Edit `frontend/README.md`: add a short "Container build" note — the Docker image builds with `VITE_API_BASE_URL=""` so the app calls `/api/...` on its own origin through nginx (`frontend/nginx/default.conf.template`); the dev server default `http://localhost:8000` is unchanged; the image build fails if `localhost:8000` appears in `dist/`.

**Checkpoint**: Both ways of running the app work side by side with separate data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation (FR-020) and final validation.

- [X] T035 Edit root `README.md`: add a "Run with Docker" section (English, FR-020) containing: the only prerequisites (Docker Engine ≥ 25 or Docker Desktop ≥ 4.27, Compose ≥ 2.24, Git; check with `docker compose version`); start `docker compose up -d --build --wait` and foreground variant `docker compose up --build`; address http://localhost:8080 and API docs at http://localhost:8080/docs; status `docker compose ps`; logs `docker compose logs -f`; stop `docker compose down` (data kept); reset `docker compose down -v` labelled **DESTRUCTIVE — deletes all boards, tickets, comments and history of the containerized app**; the `KANBAN_*` table copied from `contracts/run-interface.md`; how to change the port (`KANBAN_PORT=9090 docker compose up -d --wait` or `.env`) and what the "port is already allocated" error means; the network-access setting `KANBAN_BIND_ADDRESS=0.0.0.0` with a warning that the app has **no login**; first build may take several minutes, later starts are fast; data is separate from `backend/kanban.db`; E2E in containers `scripts/e2e-docker.sh` (evidence in `e2e/test-results/` and `e2e/playwright-report/`); container checks `scripts/docker-smoke.sh`; and an explicit line that the non-container workflow is unchanged and Docker is optional.
- [X] T036 [P] Edit `e2e/README.md`: add "Run in Docker" — `scripts/e2e-docker.sh [playwright args]`, what it isolates (project `kanban-e2e`, unseeded, no host port), where evidence lands, exit code meaning; the host-run example against a throwaway Compose project from quickstart §6 (`KANBAN_PORT=8081 KANBAN_SEED_ON_STARTUP=false docker compose -p kanban-e2e up -d --build --wait`, `BASE_URL=http://localhost:8081 API_URL=http://localhost:8081 npm test`, `docker compose -p kanban-e2e down -v`) with the note that pointing at your own `kanban` app leaves `E2E <runId>` boards in your data; and a "Version coupling" note that the `mcr.microsoft.com/playwright` tag in `e2e/Dockerfile` must equal the locked `@playwright/test` version and both must be bumped together.
- [X] T037 Guardrail review: `grep -rn "down -v\|volume rm\|prune" README.md backend/README.md frontend/README.md e2e/README.md scripts/ compose*.yaml` — every `down -v` must target `kanban-e2e`, `kanban-smoke` or `kanban-alt` in scripts, or be the documented reset command labelled destructive in docs; no `prune` anywhere.
- [X] T038 Run every scenario in `specs/004-containerize-app/quickstart.md` §1–§8 in order on the current machine, except §4 (reset): it runs `docker compose down -v` on project `kanban` and would delete your own data, so it is covered instead by the reset check in `check_us2` (T015) on `kanban-smoke`. Never run `down -v` on `kanban` here. and record the timings for SC-002 (cold build < 10 min, warm `up -d --wait` < 30 s); fix any deviation in the relevant file.
- [X] T039 Multi-arch check (FR-018): on the opposite CPU architecture to the one used in T038 (Intel/AMD vs ARM64/Apple Silicon), or via `docker buildx build --platform linux/amd64,linux/arm64` for `backend/`, `frontend/` and `e2e/` without `--push`, confirm all three images build; then run `scripts/docker-smoke.sh` on that machine if available.
- [X] T040 Final sweep: `scripts/docker-smoke.sh` and `scripts/e2e-docker.sh` both exit 0 from a fresh clone (`git clone` into a temp dir, no `.env`); `git status` shows only the intended new/edited files listed in plan.md "Source Code" plus edits under `specs/004-containerize-app/` (T001's pinned versions, task checkboxes); no `.env`, `kanban.db`, `test-results/` or `playwright-report/` staged.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 must finish before T010, T012, T021 (pinned tags).
- **Foundational (Phase 2)**: depends on T002. Blocks all user stories.
- **US1 (Phase 3)**: depends on Phase 2 and T003–T004. Creates `compose.yaml` and both app images.
- **US2 (Phase 4)**: depends on US1 (edits `compose.yaml` created in T013).
- **US3 (Phase 5)**: depends on US1 (needs the app images); independent of US2 (its own throwaway volume) — can run in parallel with US2 once T013 exists, except both edit nothing in common (US3 only adds `compose.e2e.yaml`).
- **US4 (Phase 6)**: depends on US1 and US2 (T026 edits `compose.yaml` after T016).
- **US5 (Phase 7)**: depends on all files from US1–US4 existing (regression guard over the final state); T033/T034 docs can be written any time after US1.
- **Polish (Phase 8)**: depends on all stories.

### Story Completion Order

```text
Setup → Foundational → US1 (MVP) ─┬─→ US2 ─→ US4 ─┐
                                  └─→ US3 ─────────┴─→ US5 → Polish
```

### Within Each Story

- Smoke/E2E checks are written first and seen to fail (T008–T009, T014 for the hardening checks, T015, T018–T020, T025).
- Dockerfiles before `compose.yaml`; `compose.yaml` before smoke runs.
- Story checkpoint passes before the next story edits the same file.

### Same-file sequencing (no [P] across these)

- `scripts/docker-smoke.sh`: T006 → T008 → T015 → T025.
- `compose.yaml`: T013 → T016 → T026.
- `frontend/Dockerfile` depends on `frontend/nginx/default.conf.template` (T011 → T012).

---

## Parallel Examples

### Phase 1

```text
Task: "T003 Create backend/.dockerignore"
Task: "T004 Create frontend/.dockerignore"
Task: "T005 Create e2e/.dockerignore"
```

### User Story 1

```text
Task: "T010 Create backend/Dockerfile"
Task: "T011 Create frontend/nginx/default.conf.template"
# then T012 frontend/Dockerfile, then T013 compose.yaml
```

### User Story 3 (can run alongside US2 after T013)

```text
Task: "T018 Create compose.e2e.yaml"
Task: "T019 Create scripts/e2e-docker.sh"
```

### User Story 5

```text
Task: "T030 Backend non-container suite"
Task: "T031 Frontend non-container suite"
Task: "T033 backend/README.md note"
Task: "T034 frontend/README.md note"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 smoke harness (red).
2. Phase 3 US1: checks red → Dockerfiles + nginx + `compose.yaml` → checks green.
3. **STOP and VALIDATE**: quickstart §1–§2 on a Docker-only machine.

Note: US1 alone keeps data only until `docker compose down` — ship US2 with it before calling the app usable beyond a demo.

### Incremental Delivery

1. US1 → one-command app (demo).
2. US2 → persistent data (usable).
3. US3 → E2E in containers (CI-ready).
4. US4 → externally configured, hardened images (deploy-ready).
5. US5 → regression proof of the non-container path, then Polish docs.

### Parallel Team Strategy

After US1: developer A takes US2 → US4 (`compose.yaml`, smoke checks); developer B takes US3 (`compose.e2e.yaml`, `e2e/Dockerfile`, `scripts/e2e-docker.sh`). US5 and Polish after both merge.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- Commit after each checkpoint.
- Never edit application source or tests to make a container check pass — fix the container files instead.
- The root `.env` holds a developer secret (`STITCH_API_KEY`); it must never reach an image or a container (`.dockerignore` + no `env_file:`).

---

## Phase 9: Convergence

- [X] T041 Make `scripts/docker-smoke.sh` and `scripts/e2e-docker.sh` immune to `KANBAN_*` values in the developer's root `.env` (Compose reads it for interpolation even with `-p`): in each script, export the documented defaults for every `KANBAN_*` variable the script does not set itself (`KANBAN_BIND_ADDRESS=127.0.0.1`, `KANBAN_SEED_ON_STARTUP=true`, `KANBAN_CORS_ORIGINS=`, `KANBAN_DATABASE_URL=sqlite:////data/kanban.db`, `KANBAN_BACKEND_UPSTREAM=http://backend:8000`), so a `.env` with e.g. `KANBAN_BIND_ADDRESS=0.0.0.0`, `KANBAN_SEED_ON_STARTUP=false` or `KANBAN_CORS_ORIGINS=*` can no longer make the smoke checks (d), (h), (p) fail falsely or break the throwaway E2E stack; keep the `.env`-leak check working; verify by creating a temporary root `.env` with those values, running both scripts to exit 0, then restoring the original `.env` per plan: R14 verification approach / contracts/run-interface.md "own throwaway project" (partial)
- [X] T042 Edit the "Run with Docker → Prerequisites" list in root `README.md` to state that `scripts/e2e-docker.sh` and `scripts/docker-smoke.sh` need a POSIX shell (macOS, Linux or WSL on Windows) and that `scripts/docker-smoke.sh` also needs `curl`, matching the host prerequisites in `contracts/run-interface.md`; the start/stop/reset commands still need only Docker per FR-020 (partial)
