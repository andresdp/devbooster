# Data Model: Containerized Kanban App

**Feature**: `004-containerize-app` | **Date**: 2026-11-01

This feature adds **no application data entities** and changes no database schema: boards,
tickets, comments and history keep the model in
[`specs/001-kanban-ticketing/data-model.md`](../001-kanban-ticketing/data-model.md). What it adds is
a runtime model: the containers, the stores they persist to, and the settings that configure them.

## Compose projects

| Project name | Started by | Purpose | Lifetime |
|---|---|---|---|
| `kanban` | `docker compose up` (default, from `compose.yaml` `name:`) | The person's own app | Until `down`; data until `down -v` |
| `kanban-e2e` | `scripts/e2e-docker.sh` | One E2E run | Removed (incl. volume) when the run ends |
| `kanban-smoke` | `scripts/docker-smoke.sh` | Container smoke checks | Removed (incl. volume) when the check ends |

Projects never share containers, networks or volumes: Compose prefixes every resource with the
project name.

## Services

### `backend`

| Attribute | Value |
|---|---|
| Image | built from `backend/Dockerfile` (stage `runtime`) |
| Process | `uvicorn app.main:app --host 0.0.0.0 --port 8000`, 1 worker, no reload |
| User | UID/GID `10001` (`app`) |
| Container port | `8000`, **not published** to the host (`expose` only) |
| Mounts | named volume `kanban-data` → `/data` |
| Health | `GET http://127.0.0.1:8000/api/v1/boards` via Python stdlib → 2xx |
| Restart | `unless-stopped` |

### `frontend`

| Attribute | Value |
|---|---|
| Image | built from `frontend/Dockerfile` (stage `runtime`, nginx-unprivileged) |
| Content | Vite `dist/` built with `VITE_API_BASE_URL=""` (relative API URLs) |
| User | `nginx` (UID 101, non-root) |
| Container port | `8080`, the **only** port published: `${KANBAN_BIND_ADDRESS}:${KANBAN_PORT}:8080` |
| Routes | see [contracts/http-routing.md](contracts/http-routing.md) |
| Depends on | `backend` — `service_healthy`, `restart: true` |
| Health | `GET http://127.0.0.1:8080/api/v1/boards` (through the proxy) → 2xx |
| Restart | `unless-stopped` |

### `e2e` (only in `compose.e2e.yaml`)

| Attribute | Value |
|---|---|
| Image | built from `e2e/Dockerfile` (`mcr.microsoft.com/playwright:v1.64.1-noble`) |
| User | `pwuser` (non-root) |
| Env | `BASE_URL=http://frontend:8080`, `API_URL=http://frontend:8080`, `CI=1` |
| Depends on | `frontend` — `service_healthy` |
| Outputs | `/e2e/test-results`, `/e2e/playwright-report` — copied to the host `e2e/` after the run |

## Stores

| Store | Where | Seeded | Created | Removed |
|---|---|---|---|---|
| App data store | volume `kanban_kanban-data`, file `/data/kanban.db` (+ `-wal`, `-shm`) | Yes, once, when empty (existing `seed_if_empty`) | first `up` | only `docker compose down -v` (reset) |
| E2E run store | volume `kanban-e2e_kanban-data` | No | each E2E run | end of that run |
| Smoke store | volume `kanban-smoke_kanban-data` | per check | each smoke run | end of that run |
| Dev store (unchanged) | `backend/kanban.db` on the host | Yes | first non-container run | by hand |

**Invariants**

- The app data store survives `stop`/`start`, `down`/`up`, host restarts and image rebuilds (FR-006).
- The sample board exists at most once in a store (existing seed guard; FR-007).
- No store is ever reachable from another project or from the non-container backend (FR-008, FR-010).
- No store is ever part of an image (`.dockerignore` excludes `kanban.db*`; FR-016).

## Runtime settings

Supplied from outside the images; full list with defaults and validation in
[contracts/run-interface.md](contracts/run-interface.md#configuration).

| Setting | Consumer | Validation / rule |
|---|---|---|
| `KANBAN_PORT` | Compose → frontend port | 1–65535; taken port → `up` fails naming it |
| `KANBAN_BIND_ADDRESS` | Compose → frontend port | default `127.0.0.1`; `0.0.0.0` = network access (no login, README warns) |
| `KANBAN_SEED_ON_STARTUP` | backend `SEED_ON_STARTUP` | `1/true/yes/on` = on, anything else off (existing parser) |
| `KANBAN_CORS_ORIGINS` | backend `CORS_ORIGINS` | comma-separated explicit origins; `*` rejected at startup (existing); empty = none |
| `KANBAN_DATABASE_URL` | backend `DATABASE_URL` | SQLite URL; default inside the volume |
| `KANBAN_BACKEND_UPSTREAM` | frontend `BACKEND_UPSTREAM` | `http://host:port`, no path |

## State transitions (app lifecycle)

```text
(nothing) --up--> starting --backend healthy--> backend ready --frontend healthy--> READY
READY --stop / down--> stopped (data kept)      --up--> starting
READY --down -v (reset)--> (nothing, data gone) --up--> starting (fresh seed)
READY --backend recreated--> frontend restarted by Compose --> READY
```
