# Contract: What the Suite Relies On

The suite depends on two surfaces of the app. If either changes, the matching helper in
`e2e/support/` is the single place to update.

## 1. Backend API (setup only)

Source of truth: [`specs/001-kanban-ticketing/contracts/openapi.json`](../../001-kanban-ticketing/contracts/openapi.json).
All paths under `${API_URL}/api/v1`.

| Helper (`support/api.js`) | Request | Uses from response |
|---------------------------|---------|--------------------|
| `createBoard(name)` | `POST /boards` `{ name }` → 201 `BoardCreated` | `id`, `columns[].{id,name}` |
| `createTicket(boardId, fields)` | `POST /boards/{board_id}/tickets` `TicketCreate` → 201 `Ticket` | `key`, `title` |
| `moveTicket(key, columnId, position?)` | `POST /tickets/{key}/move` `TicketMove` → 200 | none |
| reachability | `GET /boards` → 200 | none |

Non-2xx responses throw with the uniform error body `{ error: { code, message, details } }`.

## 2. Web app (step under test and every outcome)

Only roles, labels and visible text (FR-012). The one structural exception is marked ⚠.

| Thing | Locator |
|-------|---------|
| Board page | `page.goto('/boards/<id>')` |
| Column ⚠ | `page.locator('section').filter({ has: getByRole('heading', { level: 2, name: /^<Column>\s*\d+$/ }) })` — column sections have no accessible name; see research R-10 |
| Card | within column: `getByRole('link', { name: '<KEY> <title>' })` |
| Card order | within column: `getByRole('link', { name: /^TKT-\d+ / })` |
| New ticket | `getByRole('button', { name: '+ New ticket' })` → `getByRole('dialog', { name: 'New ticket' })` |
| Create fields | `getByLabel('Title')`, `getByLabel('Description')`, `getByLabel('Type')`, `getByLabel('Priority')`, `getByLabel('Assignee')`; submit `getByRole('button', { name: 'Create ticket' })` (Type and Priority are `<select>`s here: `selectOption({ label })`) |
| Required error | `getByText('Required')` next to Title |
| Open ticket | click the card → `getByRole('dialog')` with heading containing the key |
| Edit | `getByRole('button', { name: 'Edit' })`; `getByLabel('Title')`, `getByLabel('Description')`, `getByLabel('Assignee')`; `getByRole('radiogroup', { name: 'Type' \| 'Priority' })` → `getByRole('radio', { name })`; `getByRole('button', { name: 'Save' })` |
| Move from drawer | `getByLabel('Move to')` → `selectOption({ label })`, `getByRole('button', { name: 'Move' })` |
| History | `getByRole('tab', { name: /^History/ })` → `getByRole('listitem')`: `Created in To Do`, `To Do → In Progress`, `In Progress → Review` |
| Close drawer | `getByRole('button', { name: 'Close' })` |

Exact texts were read from the components on 2026-11-01 and are re-confirmed against the components during implementation;
any mismatch is fixed in the helper, not by adding test ids to the product (AS-011).

## Drag gesture

`dragCard(page, card, target)` in `support/board.js`: hover card → `mouse.down()` → move 10 px
(beyond dnd-kit's 6 px activation) → `mouse.move(x, y, { steps: 15 })` to target → `mouse.up()`.
Every drag outcome is re-checked after `page.reload()` (EC-005).
