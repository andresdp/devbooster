# Contract: MSW Handler Set (test double for the backend)

`frontend/src/test/msw/handlers.ts` implements every operation of
`specs/001-kanban-ticketing/contracts/openapi.json` over an in-memory store so component tests
never need a running backend (constitution IV). Shapes are typed from `schema.d.ts`; behaviour
mirrors `contracts/api.md` for the rules the UI depends on. `onUnhandledRequest: "error"` makes
any request outside this list fail the test.

## Store

`createStore(seed?)` returns `{ boards, columns, tickets, comments, history, nextTicketId }` and
is reset in `beforeEach` from `fixtures.ts`, which holds one sample board (id 1, four columns
with ids 1–4 named To Do, In Progress, Review, Done) with 7 tickets spread across columns, 2
comments and 3 history entries on `TKT-3`. A `createLargeBoard(200)` fixture backs the EC-006 test.

## Handlers and simulated rules

| Operation | Success | Errors reproduced |
|-----------|---------|-------------------|
| `GET /api/v1/boards` | `BoardSummary[]` in creation order | — |
| `POST /api/v1/boards` | 201 `BoardCreated` with four columns | 422 `validation_error` `[{field:"name", …}]` when trimmed name is empty or > 100; 409 `conflict` when the name matches an existing one case-insensitively |
| `GET /api/v1/boards/{id}` | `BoardDetail`, columns by position, tickets by position | 404 `not_found` for unknown id; 422 `validation_error` for a non-integer id |
| `POST /api/v1/boards/{id}/tickets` | 201 `Ticket` at the bottom of the first column, key `TKT-{n}`, defaults applied | 404 unknown board; 422 with one `details` entry per violated field (`title` empty/> 200, `description` > 10,000, `assignee` > 100, bad `type`/`priority`, unknown field) |
| `GET /api/v1/tickets/{key}` | `Ticket` | 422 malformed key; 404 unknown |
| `PATCH /api/v1/tickets/{key}` | `Ticket` with fields applied, `updated_at` bumped; `assignee` null/blank → null; `description` "" allowed | 422 empty body / empty title / too long / unknown field; 404 |
| `POST /api/v1/tickets/{key}/move` | `Ticket` moved; source and target renumbered; history entry appended only when the column changes; same column and position → 200 no-op | 422 `invalid_move` when `column_id` is not on the ticket's board or `position` is out of range (cross-column `0..n`, same column `0..n-1`); 422 `validation_error` for negative/non-integer position; 404 |
| `GET /api/v1/tickets/{key}/comments` | `Comment[]` oldest first | 404; 422 malformed key |
| `POST /api/v1/tickets/{key}/comments` | 201 `Comment` | 422 per field (`author`, `text` empty or too long); 404 |
| `GET /api/v1/tickets/{key}/history` | `HistoryEntry[]` oldest first, first entry has `from_column: null` | 404; 422 malformed key |

All error bodies are `{ error: { code, message, details } }` with `details` an array for
`validation_error` and `null` otherwise, exactly as the backend.

## Failure switches for tests

Individual tests override handlers with `server.use(...)` to simulate:

- `500 internal_error` with the generic message (EC-001),
- `HttpResponse.error()` for an unreachable server (`network_error`, US1-AS8, US4-AS5),
- a delayed response (`delay(…)`) to assert pending/disabled states (FR-016, US2-AS6),
- `invalid_move` on a move to assert rollback plus board refetch (FR-010, EC-004),
- a `validation_error` naming a field the form does not show, to assert the form-level
  fallback (EC-002).

## Contract-drift guard

`src/api/schema.contract.test.ts` regenerates the types from the contract in memory and fails
when `schema.d.ts` differs. Handler request/response objects are declared with the generated
types, so a contract change that alters a shape fails type-checking in the handlers as well.
