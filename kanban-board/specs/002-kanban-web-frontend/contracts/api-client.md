# Contract: Frontend API Client

`frontend/src/api/client.ts` is the only module that calls `fetch`. It is typed exclusively from
`schema.d.ts` (generated, see `research.md` §3). This file fixes its surface so tests and MSW
handlers can be written first.

## Configuration

| Item | Value |
|------|-------|
| Base URL | `import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"` (set in `.env.example`) |
| Prefix | `/api/v1` |
| Headers | `Accept: application/json`; `Content-Type: application/json` when a body is sent |
| Credentials | none (no auth, AS-004) |

## Operations

Each function maps one contract operation; request and response types are
`paths["<path>"]["<method>"]["requestBody"]["content"]["application/json"]` and
`...["responses"][2xx]["content"]["application/json"]`.

| Function | Method and path | Body | Resolves to |
|----------|-----------------|------|-------------|
| `boards.list(signal?)` | `GET /boards` | — | `BoardSummary[]` |
| `boards.create(body)` | `POST /boards` | `BoardCreate` | `BoardCreated` |
| `boards.get(id, signal?)` | `GET /boards/{board_id}` | — | `BoardDetail` |
| `tickets.create(boardId, body)` | `POST /boards/{board_id}/tickets` | `TicketCreate` | `Ticket` |
| `tickets.get(key, signal?)` | `GET /tickets/{key}` | — | `Ticket` (exported for completeness; not used by the views) |
| `tickets.update(key, body)` | `PATCH /tickets/{key}` | `TicketUpdate` | `Ticket` |
| `tickets.move(key, body)` | `POST /tickets/{key}/move` | `TicketMove` | `Ticket` |
| `comments.list(key, signal?)` | `GET /tickets/{key}/comments` | — | `Comment[]` |
| `comments.add(key, body)` | `POST /tickets/{key}/comments` | `CommentCreate` | `Comment` |
| `history.list(key, signal?)` | `GET /tickets/{key}/history` | — | `HistoryEntry[]` |

Path parameters are URL-encoded. All functions return `Promise<T>` and reject only with
`ApiError`.

## Error mapping

| Situation | `ApiError` fields |
|-----------|-------------------|
| Response with status ≥ 400 and a JSON body matching `ErrorResponse` | `status` = HTTP status, `code`, `message`, `details` from the body (`details ?? []`) |
| Response with status ≥ 400 and a body that is not `ErrorResponse` | `status` = HTTP status, `code: "unexpected_response"`, `message: "Unexpected response from the server (<status>)."`, `details: []` |
| `fetch` rejects (offline, CORS, DNS) | `status: 0`, `code: "network_error"`, `message: "Could not reach the server."` |
| Request aborted via `signal` | rethrown as the native `AbortError` (callers ignore it) |
| 2xx with invalid JSON | `code: "unexpected_response"` with the status |

Helpers exported next to `ApiError`:

- `isApiError(e: unknown): e is ApiError`
- `fieldErrors(e: ApiError, visible: readonly string[]) → { byField: Record<string, string>; rest: string[] }`
  — `details` entries whose `field` is in `visible` go to `byField` (first message wins), all
  others to `rest`; when `rest` is non-empty or `byField` is empty the caller shows `e.message`
  (plus `rest` messages) at form level.

## Non-goals

No retries, no caching, no request de-duplication, no interceptors. Refetching after mutations
is the caller's responsibility (`useResource.reload`).
