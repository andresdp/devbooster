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

`{key}` is the human-readable key, e.g. `TKT-12`.
## Request bodies

- `BoardCreate`: `{ "name": str }`
- `TicketCreate`: `{ "title": str (required), "description"?: str, "type"?: "bug"|"feature"|"task", "priority"?: "low"|"medium"|"high"|"critical", "assignee"?: str|null }`
- `TicketUpdate`: any subset of `TicketCreate` fields; at least one must be present
- `TicketMove`: `{ "column_id": int, "position"?: int }` (zero-based; omitted = bottom of target column)
- `CommentCreate`: `{ "author": str, "text": str }`

## Response shapes

- `Ticket`: `{ key, title, description, type, priority, assignee, board_id, column_id, position, created_at, updated_at }`
- `BoardDetail`: `{ id, name, created_at, columns: [ { id, name, position, tickets: Ticket[] } ] }`
- `Comment`: `{ id, ticket_key, author, text, created_at }`
- `HistoryEntry`: `{ id, ticket_key, from_column: {id,name}|null, to_column: {id,name}, changed_at }`

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
| 404 | `not_found` | Board or ticket does not exist |
| 409 | `conflict` | Duplicate board name |
| 422 | `validation_error` | Schema/field validation failure (empty after trim, bad enum, too long, unknown JSON shape, malformed key) |
| 422 | `invalid_move` | Target column not on the ticket's board, or position out of range |
| 500 | `internal_error` | Unexpected failure; generic message, no internals |

`details` is an array for `validation_error` and `null` otherwise.

## CORS

Allowed origins come from `CORS_ORIGINS` (default `http://localhost:5173`); no wildcard.
