# API Contract: Kanban Ticketing System

Human-readable summary. The authoritative machine contract is `openapi.json` in this folder, generated from the running app by `backend/scripts/export_openapi.py` and verified by `backend/tests/test_contract.py`. All routes are under `/api/v1`. Interactive docs are at `/docs`.

## Endpoints

| Method | Path | Story | Success | Errors |
|--------|------|-------|---------|--------|
| POST | `/boards` | US1 | 201 `Board` (with 4 columns) | 409 duplicate name, 422 |
| GET | `/boards` | US1 | 200 `Board[]` (summary) | |
| GET | `/boards/{board_id}` | US1 | 200 `BoardDetail` (columns in order, each with ordered tickets) | 404 |
| POST | `/boards/{board_id}/tickets` | US1 | 201 `Ticket` (first column, bottom) | 404 board, 422 |
| GET | `/tickets/{key}` | US1 | 200 `Ticket` (full details) | 404, 422 malformed key |
| PATCH | `/tickets/{key}` | US1 | 200 `Ticket` | 404, 422 |
| POST | `/tickets/{key}/move` | US2 | 200 `Ticket` | 404 ticket, 422 foreign/unknown column or bad position |
| POST | `/tickets/{key}/comments` | US3 | 201 `Comment` | 404, 422 |
| GET | `/tickets/{key}/comments` | US3 | 200 `Comment[]` chronological | 404 |
| GET | `/tickets/{key}/history` | US3 | 200 `HistoryEntry[]` chronological | 404 |

`{key}` is the human-readable key, e.g. `TKT-12`: pattern `^TKT-[1-9][0-9]*$`, case-sensitive, no maximum width. Any other form (e.g. `tkt-12`, `TKT-0`, `TKT-012`) is `422 validation_error`; a well-formed key that does not exist is `404 not_found`. Lists (`/boards`, comments, history) are returned in full: no pagination, no filtering.

## Request bodies

All bodies are strictly typed: no type coercion (`"1"` is not accepted for an integer), unknown fields are rejected, and an invalid JSON body is a `validation_error`. Strings are trimmed before validation; length limits are in Unicode code points after trimming.

- `BoardCreate`: `{ "name": str }` (1–100)
- `TicketCreate`: `{ "title": str (required, 1–200), "description"?: str (0–10,000), "type"?: "bug"|"feature"|"task", "priority"?: "low"|"medium"|"high"|"critical", "assignee"?: str|null (0–100; absent, null or blank = unassigned) }`. `type`, `priority` and `description` do not accept null.
- `TicketUpdate`: any subset of `TicketCreate` fields; at least one must be present (empty body is 422). Omitted = unchanged. `description: ""` empties the description; `assignee: null` or a blank string clears the assignee; `title` cannot be empty. It cannot change board, column or position (those fields are unknown and rejected).
- `TicketMove`: `{ "column_id": int, "position"?: int >= 0 }` (zero-based). Omitted position = bottom of the target column (for the current column: its last position). Different column: valid `0..n` (n = tickets in target). Same column (reorder): valid `0..n-1`. Same column and same position is a successful no-op: `200`, no history entry, `updated_at` unchanged.
- `CommentCreate`: `{ "author": str (1–100), "text": str (1–5,000) }`

## Response shapes

- `Board` (summary, used by `POST /boards` and `GET /boards`): `{ id, name, created_at }`; `POST /boards` also returns `columns: [ { id, name, position } ]` (no tickets).
- `Ticket`: `{ key, title, description, type, priority, assignee (null when unassigned), board_id, column_id, position, created_at, updated_at }`. Comments and history are not embedded.
- `BoardDetail`: `{ id, name, created_at, columns: [ { id, name, position, tickets: Ticket[] } ] }`
- `Comment`: `{ id, ticket_key, author, text, created_at }`
- `HistoryEntry`: `{ id, ticket_key, from_column: {id,name}|null, to_column: {id,name}, changed_at }`. The first entry of every ticket is its creation (`from_column` null, `to_column` = first column); one entry is added per column change.

Timestamps are UTC ISO-8601 with an explicit offset (e.g. `2026-10-20T12:00:00.123456Z`). Comments and history are ordered by timestamp, ties broken by id (creation order).

## Uniform error body (all non-2xx)

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [ { "field": "title", "message": "String should have at least 1 character" } ]
  }
}
```

| Status | `code` | When |
|--------|--------|------|
| 404 | `not_found` | Board or ticket (well-formed key) does not exist; applies to every operation taking a key |
| 409 | `conflict` | Duplicate board name |
| 422 | `validation_error` | Schema/field validation failure (empty after trim, bad enum, too long, wrong JSON type, null for a non-nullable field, missing or unknown field, non-integer or negative position, invalid JSON, malformed key) |
| 422 | `invalid_move` | Target column unknown or not on the ticket's board, or position out of range |
| 500 | `internal_error` | Unexpected failure; generic message, no stack trace or database detail. Create and move are single transactions, so nothing is partially stored |
| 4xx | `http_error` | Other framework errors (e.g. 405 unsupported method; no delete operations exist) in the same body |

`details` is an array of `{field, message}` for `validation_error` and `null` otherwise. `message` always states what was wrong.

## CORS

Allowed origins come from `CORS_ORIGINS` (default `http://localhost:5173`); no wildcard.
