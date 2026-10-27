# Data Model: Kanban Web Frontend

The frontend owns no persistent data. Its model is (1) the contract types, generated and never
hand-written, (2) a small set of derived view types, and (3) transient UI state. Field rules
below come from `specs/001-kanban-ticketing/contracts/api.md`; the app enforces only the
required-field check (FR-023) and shows the server's message for everything else.

## 1. Contract entities (generated into `src/api/schema.d.ts`)

Aliases exported from `src/api/types.ts` (type aliases over `components["schemas"]`, no new shapes):

| Alias | Schema | Fields | Used by |
|-------|--------|--------|---------|
| `BoardSummary` | `BoardSummary` | `id: number`, `name: string`, `created_at: string` | Board list |
| `BoardCreated` | `BoardCreated` | `BoardSummary` + `columns: ColumnRead[]` | Create board result |
| `BoardDetail` | `BoardDetail` | `id`, `name`, `created_at`, `columns: ColumnWithTickets[]` | Board page (single source of truth for the board and the open ticket) |
| `ColumnWithTickets` | `ColumnWithTickets` | `id: number`, `name: string`, `position: number`, `tickets: Ticket[]` | Column |
| `ColumnRef` | `ColumnRef` | `id`, `name` | History entries |
| `Ticket` | `TicketRead` | `key`, `title`, `description`, `type: TicketType`, `priority: Priority`, `assignee: string \| null`, `board_id`, `column_id`, `position`, `created_at`, `updated_at` | Card, drawer |
| `TicketType` | `TicketType` | `"bug" \| "feature" \| "task"` | Badges, forms |
| `Priority` | `Priority` | `"low" \| "medium" \| "high" \| "critical"` | Badges, forms |
| `BoardCreate` | `BoardCreate` | `name` (1–100 after trim) | Create board form |
| `TicketCreate` | `TicketCreate` | `title` (1–200, required), `description?` (≤10,000), `type?`, `priority?`, `assignee?: string \| null` (≤100) | Create ticket form |
| `TicketUpdate` | `TicketUpdate` | any subset of `title`, `description`, `type`, `priority`, `assignee` (≥1 field) | Edit form |
| `TicketMove` | `TicketMove` | `column_id: number`, `position?: number \| null` (zero-based; omitted = bottom) | Drag-drop, move-from-detail |
| `Comment` | `CommentRead` | `id`, `ticket_key`, `author`, `text`, `created_at` | Comments tab |
| `CommentCreate` | `CommentCreate` | `author` (1–100), `text` (1–5,000) | Comment form |
| `HistoryEntry` | `HistoryEntryRead` | `id`, `ticket_key`, `from_column: ColumnRef \| null`, `to_column: ColumnRef`, `changed_at` | History tab |
| `ErrorResponse` | `ErrorResponse` | `error: { code: string, message: string, details?: ErrorDetail[] \| null }` | `ApiError` |
| `ErrorDetail` | `ErrorDetail` | `field: string`, `message: string` | Field errors |

Relationships: `BoardDetail 1─* ColumnWithTickets 1─* Ticket`; `Ticket 1─* Comment`;
`Ticket 1─* HistoryEntry`. Ticket keys are global (`TKT-n`), board-scoped lookups happen by
scanning the loaded board's columns.

Server defaults relied on (AS-006): `type = "task"`, `priority = "medium"`, `description = ""`,
`assignee = null`. The create form sends only fields the user filled in so the server applies
them.

## 2. Client-side types (`src/api/errors.ts`, `src/model/`)

### ApiError

```text
ApiError extends Error
  status:  number          // HTTP status; 0 when the request never got a response
  code:    string          // server code: not_found | conflict | validation_error | invalid_move | internal_error | http_error
                           // client codes: network_error | unexpected_response
  message: string          // server message, or the client fallback text
  details: ErrorDetail[]   // [] when the server sent null/absent
```

Helpers: `fieldErrors(err, visibleFields) → { byField: Record<string,string>, rest: string[] }`
(details naming a field not in `visibleFields` go to `rest`, EC-002); `isApiError(x)`.

### Board view helpers (pure functions, unit-tested)

- `findTicket(board, key) → { ticket, column } | undefined`
- `applyMove(board, key, toColumnId, toIndex) → BoardDetail` (immutable; removes from source,
  inserts at index, renumbers `position` and `column_id` locally)
- `movePayload(board, key, toColumnId, toIndex) → TicketMove | null` (null when nothing changes,
  FR-009)
- `columnOrder(board) → ColumnWithTickets[]` sorted by `position`

### Form state

```text
FormState<TValues>
  values:      TValues
  fieldErrors: Partial<Record<keyof TValues, string>>   // "Required" (client) or server message
  formError:   string | null                            // non-field server errors, EC-002 fallback
  pending:     boolean                                  // one submission at a time, FR-016
```

Required-field rule (FR-023): a value is missing when `value.trim() === ""`; message text
"Required". No other client-side validation.

Edit form diff (FR-007): `diff(original: Ticket, values) → TicketUpdate` includes only changed
fields; `assignee` cleared → `null`; `description` cleared → `""`; an empty diff means Save
behaves like Cancel (no request).

## 3. UI state and transitions

### Resource state (`useResource`)

```text
loading ──success──▶ ready ──reload()──▶ loading (keeps previous data for the drawer) ──▶ ready
   │                  │
   └──failure──▶ error ◀──failure──┘        error ──retry──▶ loading
```

Rendering: `loading` → `Skeleton`; `error` → `ErrorState` with the `ApiError.message` and a
Retry button (FR-018, US1-AS8); `error.status === 404` on the board route → not-found view with a
link to `/` (US1-AS7).

### Action state (`useAction`)

`idle → pending → idle` (success, caller reloads) or `idle → pending → failed(error)`; `execute`
is a no-op while `pending` (FR-016); results arriving after unmount are dropped (EC-008).

### Drag lifecycle (BoardPage)

```text
idle
 └─ dragStart(key)        → dragging { snapshot: board, activeKey }
dragging
 ├─ dragOver(overId)      → dragging (board = applyMove(board, key, hoveredColumn, hoveredIndex))
 ├─ dragCancel / drop outside (over == null) → idle (board = snapshot)
 └─ dragEnd(over)         → payload = movePayload(snapshot, key, column, index)
      ├─ payload == null  → idle (board = snapshot; no request, no error)        FR-009
      └─ else             → committing { payload } (board keeps optimistic state)
committing
 ├─ 200                   → idle; reload()                                        FR-008
 ├─ ApiError invalid_move → idle; board = snapshot; notice(message); reload()     FR-010, EC-004
 └─ other ApiError        → idle; board = snapshot; notice(message)              FR-010
```

While `committing`, the moved card renders with the `saving` modifier only if the request takes
longer than 300 ms (avoids flicker on fast local responses); on failure the snapshot is restored
synchronously with no intermediate modifier (FR-010); a second drag is ignored until the state
returns to `idle`.

### Route state

| Route | Params | Derived state |
|-------|--------|---------------|
| `/` | — | board list resource |
| `/boards/:boardId` | `boardId: /^\d+$/` | board resource; drawer closed |
| `/boards/:boardId/tickets/:key` | `key: /^TKT-[1-9][0-9]*$/` | board resource; drawer open on `findTicket(board, key)` or drawer not-found state |

Invalid params never trigger a request; they render the not-found view directly (FR-017).

### Phone-width board state

`visibleColumnIndex: number` (0–3) derived from the columns row's `scrollLeft / clientWidth`,
rendered as "n / 4" and dots; purely presentational.

## 4. Presentation rules

- Timestamps: `new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })`
  on `Date.parse(iso)`; the ISO string is kept in a `title`/`dateTime` attribute (FR-022).
- Unassigned: literal "Unassigned", italic, outline colour (EC-011, FR-004).
- Long text: card titles clamp to 2 lines; the drawer wraps with `overflow-wrap: anywhere`; the
  assignee on a card is truncated with an ellipsis and full in the drawer (EC-005).
- Column tickets are rendered in `tickets` array order (the server's order, FR-003); the local
  `position` field is only used by `applyMove`.
