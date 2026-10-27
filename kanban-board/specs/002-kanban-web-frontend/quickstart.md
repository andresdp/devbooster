# Quickstart: Kanban Web Frontend

Validation guide: how to run the frontend from a fresh checkout and prove each user story
end-to-end. Implementation details live in `plan.md` and `tasks.md`; shapes in `data-model.md`
and `contracts/`.

## Prerequisites

- Node.js 22 LTS and npm 10+ (`node --version`).
- The backend running locally (see `backend/README.md`):

  ```sh
  cd backend && uv sync && uv run uvicorn app.main:app --reload
  ```

  It listens on `http://localhost:8000`, allows origin `http://localhost:5173`, and seeds the
  "Sample Project" board on first start.

## Commands (run inside `frontend/`)

| Purpose | Command | Expected |
|---------|---------|----------|
| Install | `npm ci` (or `npm install` the first time) | no peer-dependency errors |
| Dev server | `npm run dev` | Vite on `http://localhost:5173` |
| Tests | `npm test` | all Vitest suites green, including `schema.contract.test.ts` |
| Type-check | `npm run typecheck` | runs the API-types drift check, then `tsc --noEmit`; both exit 0 |
| Lint | `npm run lint` | ESLint clean |
| Format check | `npm run format:check` | Prettier clean |
| Regenerate API types | `npm run api:generate` | rewrites `src/api/schema.d.ts`; `git diff` is empty when the contract did not change |
| Production build | `npm run build` | `dist/` produced without type errors |

Optional: `VITE_API_BASE_URL` in `frontend/.env.local` overrides the backend origin.

## Scenario walkthroughs

Each scenario is also covered by component tests (MSW); these steps validate against the real
backend.

### US1 — Browse boards and view a board

1. Open `http://localhost:5173/`. Expect the "Sample Project" board listed with its creation date.
2. Click it. Expect `/boards/1` with columns To Do, In Progress, Review, Done in that order, cards
   showing key, title, type badge, priority badge and assignee or "Unassigned"; empty columns show
   "No tickets in …".
3. Reload the page. Expect the same board.
4. Open `/boards/9999`. Expect "Board not found" and a link back to the list.
5. Stop the backend and reload `/`. Expect the error state with the message and a Retry button;
   start the backend, press Retry, expect the list.

### US2 — Create boards and tickets

1. On `/`, click "New board", submit an empty name. Expect "Required" beside the field and no
   request (check the Network tab).
2. Enter "Sample Project" (duplicate). Expect the server's conflict message beside the name.
3. Enter a new name. Expect navigation to the new board with four empty columns.
4. Click "+ New ticket" in To Do, enter only a title. Expect the card at the bottom of To Do with
   type task and priority medium.
5. Create another ticket with all fields. Expect the card to show the chosen type, priority and
   assignee; open it to see the description.
6. Submit a 201-character title. Expect the server's message beside the title, other values kept.

### US3 — View and edit ticket details

1. Click a card. Expect `/boards/1/tickets/TKT-n` and the drawer with key, title, description,
   type, priority, assignee, column, created and updated times. Press Escape; expect the board
   unchanged and the drawer closed (no reload spinner).
2. Click "Edit", change title, priority and clear the assignee, press Save. Expect one PATCH
   request, the drawer and the card updated, "Updated" time changed.
3. Click "Edit", change something, press Cancel. Expect previous values.
4. Clear the title and press Save. Expect "Required" beside it and no request.
5. Reload while the drawer is open. Expect the same ticket open.
6. Open `/boards/1/tickets/TKT-0` and `/boards/1/tickets/TKT-99999`. Expect the drawer's
   not-found message with a way back.

### US4 — Move and reorder by dragging

1. Drag a To Do card into In Progress between two cards. Expect a placeholder while hovering, the
   card in place immediately on drop, and the same arrangement after reload.
2. Drag the last card of a column to the top. Expect the order kept after reload.
3. Drag a card into the empty Review column. Expect it to be its only ticket.
4. Pick a card up and drop it back where it was. Expect no request and no error.
5. Stop the backend, drag a card. Expect the card to snap back and a notice near the board with
   the error message.
6. In the drawer, choose another column in the "Move to" select and press "Move". Expect the
   ticket at the bottom of that column and the chip updated.
7. Two tabs on the same board: move a ticket in tab A, then in tab B drag a card so the position
   is now out of range. Expect tab B to show the rejection and refresh to the server state.

### US5 — Comments and history

1. Open a ticket with no comments. Expect "No comments yet" and the form.
2. Submit with an empty author. Expect "Required" beside it, text kept.
3. Add a comment. Expect it appended with author and local time, form cleared.
4. Open the History tab after moving a ticket To Do → In Progress → Review. Expect three entries,
   oldest first: creation, then each move, with times. Reorder within a column; expect no new entry.

### Cross-cutting checks

- **SC-002**: against a board seeded with 200 tickets in one column (create them with a short
  script against the API), the board renders and scrolls within 2 s.
- **SC-005**: in DevTools device mode at 375 px width, swipe between columns (one per screen,
  "n / 4" indicator), open a ticket (full-screen drawer), move it with the "Move to" control.
- **SC-006**: compare `/boards/1` and an open drawer against
  `design/board-view.png` and `design/ticket-detail-drawer.png`, and the board list against the
  design's visual language; record the review in the PR.
- **SC-007**: `git status -- backend specs/001-kanban-ticketing` is clean.
