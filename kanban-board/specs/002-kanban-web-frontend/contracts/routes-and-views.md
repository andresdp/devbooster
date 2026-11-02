# UI Contract: Routes, Views and States

What the application exposes to the user: addresses, what each renders, and the states every view
must have (and that tests assert). Component names refer to `research.md` section 1.3.

## Routes

| Address | View | Params and validation | Not-found behaviour |
|---------|------|-----------------------|---------------------|
| `/` | `BoardListPage` | — | — |
| `/boards/:boardId` | `BoardPage` | `boardId` must match `^\d+$`; otherwise `NotFoundPage` without a request | Server 404 → `NotFoundState` ("Board not found", link "Back to boards") |
| `/boards/:boardId/tickets/:key` | `BoardPage` with `TicketDrawer` open | `key` must match `^TKT-[1-9][0-9]*$`; otherwise the drawer shows its not-found state | Key not on the loaded board → drawer "Ticket not found" with "Back to board" (closes the drawer) |
| anything else | `NotFoundPage` | — | Link to `/` |

Navigation rules: opening a card navigates to the ticket address (push); closing the drawer
navigates to the board address (replace when the drawer was opened by a direct load, push
otherwise is acceptable); creating a board navigates to its address; nothing else navigates.
Reloading any address restores the same view (FR-017).

## Views and required states

### BoardListPage (`/`)

| State | Rendering |
|-------|-----------|
| loading | header + list skeleton |
| ready, ≥1 board | heading "Boards", one row/card per board: name (link to `/boards/{id}`), "Created {local time}"; "New board" button in the header |
| ready, 0 boards | `EmptyState`: "No boards yet", helper text, primary button "New board" (US1-AS2) |
| error | `ErrorState` with the server/client message and "Retry" (US1-AS8) |
| create dialog open | `BoardCreateDialog` (below) |

### BoardPage (`/boards/:boardId`)

| State | Rendering |
|-------|-----------|
| loading | header + four column skeletons |
| ready | `BoardHeader` (name, "New ticket" is in the first column per design), `BoardNotice` slot (hidden when empty), four `Column`s in server order with count chips; empty column shows `ColumnEmptyState` "No tickets in {name}" (US1-AS5) |
| error 404 | `NotFoundState` "Board not found" + back link (US1-AS7) |
| error other | `ErrorState` + Retry (US1-AS8) |
| notice | `BoardNotice` with the last move error message and a close button; cleared on next successful action |
| phone width (<640px) | columns row scroll-snaps horizontally, one column per screen; indicator "n / 4" with dots; drawer full-screen (FR-019, EC-007) |

### TicketCard

Shows: key (mono, muted), assignee or italic "Unassigned", title (2-line clamp), type badge,
priority badge (FR-004). Whole card is a link/button to the ticket address; it is also the drag
handle. Modifiers: `dragging` (overlay copy), `placeholder` (original slot while dragging),
`saving` (move request in flight for more than 300 ms, FR-016; rollback is instant with no
modifier, FR-010).

### TicketDrawer (`/boards/:boardId/tickets/:key`)

| Section | Content |
|---------|---------|
| Header | key chip, close button (Escape also closes) |
| Column row | `ColumnChip` with current column name + `MoveToColumnSelect` (`<select>` of the other three columns + "Move" button; moves to the bottom, FR-011) |
| View mode | title (headline-md), description (or "No description"), type and priority badges, assignee (or "Unassigned"), "Created … · Updated …" line, "Edit" button (FR-006) |
| Edit mode (`TicketEditForm`) | title input*, description textarea, `SegmentedControl` type, `SegmentedControl` priority, assignee input with clear; "Save" and "Cancel" (FR-007). Field errors beside fields; other errors as `FormError` above the buttons |
| Tabs | "Comments (n)" / "History (n)"; counts come from the loaded lists |
| Comments tab | list oldest first (author, local time, text) or "No comments yet"; `CommentForm` author*, text*, "Add comment" (FR-012, US5) |
| History tab | list oldest first: "Created in {to}" for `from_column == null`, "{from} → {to}" otherwise, with local time (FR-013) |
| States | comments/history each have loading, error (inline message + retry) and empty states; ticket not found state described above |

### BoardCreateDialog

Fields: name*. Buttons: Cancel, "Create board" (disabled while pending). Client check: empty or
whitespace name → "Required" beside the field, no request (FR-023). Server 409/422 → message
beside the name field (US2-AS2); other errors → `FormError`. On success: close, go to the new
board.

### TicketCreateDialog

Fields: title*, description, type (`<select>`, default Task), priority (`<select>`, default
Medium), assignee. Note: "The ticket will be added to the bottom of To Do." Buttons: Cancel,
"Create ticket". Same validation and error placement rules; entered values are kept on failure
(FR-015). On success: close, reload board; the new card appears last in To Do.

## Error placement contract (FR-014, SC-004)

| Server response | Where shown |
|-----------------|-------------|
| 422 `validation_error` with `details[].field` matching a visible field | beside that field |
| 422 `validation_error` with a field that is not visible, or empty details | form-level `FormError` with `error.message` |
| 409 `conflict` on board create | beside the name field (the only field) |
| 404 `not_found` on a page load | page/drawer not-found state |
| 404/422 `invalid_move`/500/`http_error`/`network_error` on an action | `FormError` of the form that triggered it, or `BoardNotice` for drag-and-drop moves |
| any error on a move from the ticket detail (`MoveToColumnSelect`) | inline beneath the Move control in the drawer (FR-011); `BoardNotice` is not used |
| any error on a page/list load | `ErrorState` with Retry in place of the content |

Messages are always the server's `message`/`details[].message`; the only client-authored texts
are "Required", "Could not reach the server.", "Unexpected response from the server (<status>)."
(see `api-client.md` §Error mapping) and the not-found/empty-state copy (AS-008).

## Accessibility baseline (FR-024)

Dialogs and the drawer use `role="dialog"`, `aria-modal`, a labelled heading, focus trap and
Escape to close. Form errors are linked with `aria-describedby` and `aria-invalid`. Cards are
focusable; dnd-kit announcements use its default live region. Column headings are `<h2>`.
