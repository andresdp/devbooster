# Contract: HTTP Routing on the Single App Address

**Feature**: `004-containerize-app`

Everything is served by the `frontend` container (nginx, port 8080 in the container, published as
`${KANBAN_BIND_ADDRESS:-127.0.0.1}:${KANBAN_PORT:-8080}`). The backend is reachable only through
these routes. The API itself (paths, schemas, status codes, error body) is unchanged and defined by
[`specs/001-kanban-ticketing/contracts/openapi.json`](../../001-kanban-ticketing/contracts/openapi.json).

| Request path | Served by | Behaviour |
|---|---|---|
| `/api/` and below | backend (`BACKEND_UPSTREAM`) | Proxied with the original path and query, method and body. Adds `X-Forwarded-For`, `X-Forwarded-Proto`, keeps `Host`. |
| `/api/…` when backend is down/unreachable | nginx | `502`/`503`/`504` with `Content-Type: application/json` and the uniform body `{"error":{"code":"service_unavailable","message":"The API is temporarily unavailable.","details":null}}`. |
| `/docs` | backend | Swagger UI (Principle I). |
| `/docs/oauth2-redirect` | backend | Swagger UI helper. |
| `/openapi.json` | backend | Generated OpenAPI document, identical to the backend's own. |
| `/assets/*` | static | Hashed build files; `Cache-Control: public, max-age=31536000, immutable`; 404 if missing. |
| any other existing file (`/favicon.svg`, …) | static | |
| any other path (`/`, `/boards/1`, …) | static `index.html` | SPA fallback for client-side routes; `Cache-Control: no-cache`. |

## Guarantees

- Same origin: the browser calls `/api/v1/...` relative to the page, so no CORS preflight is needed
  in the default setup (FR-015).
- The frontend bundle contains no absolute API address (no `localhost:8000`).
- No nginx version in `Server` headers (`server_tokens off`).
- Request bodies up to nginx's default 1 MiB are accepted (largest API payloads — descriptions and
  comments — are far below this).
