# Feature Specification: Kanban Web Frontend

**Feature Branch**: `002-kanban-web-frontend`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Web frontend for the kanban ticketing system, built from scratch in frontend/, consuming the existing backend API as documented in specs/001-kanban-ticketing/contracts/ without changing the backend. The visual design comes from the Stitch export. A user can see the list of boards and open one to view its four fixed columns (To Do, In Progress, Review, Done) with ticket cards in order. They can create boards and tickets, open a ticket to see and edit its details, drag tickets between columns and reorder them within a column, add comments, and see the ticket's column-change history. Server-side errors are shown to the user in place, with validation errors next to the offending field. The app works on desktop and reasonably on mobile. Out of scope: authentication, real-time updates, deleting boards or tickets, filtering or search."

## Clarifications

### Session 2026-10-25

- Q: How will the Stitch design be delivered to the repository so planning and the visual-consistency review have a fixed reference? → A: The live Stitch project reached through the configured Stitch MCP integration, identified by project ID in the spec, is the upstream design source; a snapshot of its screens and tokens is committed under `design/` as the fixed reference for planning and SC-006 (amended by the checklist-review session below; the original answer said nothing is committed).
- Q: When a user opens a ticket from its card, should the ticket detail appear as a drawer over the board or as a separate full page? → A: Side drawer over the board with its own address (opening the address loads the board with the drawer open); on phone width the drawer takes the full screen.
- Q: Inside the ticket detail, how should editing work: one form with explicit Save and Cancel, or per-field inline editing? → A: One edit form covering title, description, type, priority and assignee, with Save and Cancel; one save request per submission.
- Q: On phone-width screens, how should the four columns be laid out so every column stays reachable? → A: Horizontal scroll with snap: one full-width column visible at a time, the user swipes between columns; each column scrolls vertically on its own.
- Q: How much validation should the app perform on its own before sending a form to the server? → A: Minimal: block submission when a required field (board name, ticket title, comment author and text) is empty or whitespace, showing a generic "required" message beside it; everything else is left to the server.

### Session 2026-10-25 (UX checklist review, see checklists/ux-review.md)

- CHK006: The frozen snapshot under `design/` is the reference for FR-020 and SC-006 and the live Stitch project is only its upstream; precedence is spec and contracts, then snapshot screens, then design-system prose, then the live project (AS-002 amended).
- CHK010: Creating a board, available from the header button on any page, succeeds by opening the new board rather than only listing it (FR-002 and US-2 AS1 amended; contracts/routes-and-views.md wins).
- CHK020: The client-authored texts are exactly "Required", "Could not reach the server.", "Unexpected response from the server (<status>)." and the not-found/empty-state copy (AS-008 amended; contracts/api-client.md wins).
- CHK024: Rollback after a failed move is instant with no intermediate card style; the only in-flight card style is `saving`, shown after 300 ms while the move commits (FR-010 and FR-016 amended; data-model.md §3 wins, `reverting` renamed).
- CHK051: Save with no changed field sends no request and behaves like Cancel, because the contract forbids an empty update (FR-007 amended; data-model.md §2 wins).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse boards and view a board (Priority: P1)

A team member opens the app and sees every existing board. They pick one and see its four columns (To Do, In Progress, Review, Done) side by side, each listing its ticket cards in the order the team last set. Each card shows enough to recognise the work at a glance: key (e.g. TKT-12), title, type, priority and assignee.

**Why this priority**: Seeing the work laid out is the entire reason a kanban frontend exists. With only this story, the team already has a read-only board they can share on a screen.

**Independent Test**: With a backend that already holds the sample board, open the app, confirm the board list shows it, open it and confirm the four columns appear in order with each ticket under the right column, in the right order, with key, title, type, priority and assignee visible.

**Acceptance Scenarios**:

1. **Given** the backend holds one or more boards, **When** the user opens the app, **Then** every board is listed by name and the user can tell boards apart.
2. **Given** the backend holds no boards, **When** the user opens the app, **Then** an empty state explains there are no boards yet and offers to create one.
3. **Given** the board list, **When** the user selects a board, **Then** the board view opens showing the columns To Do, In Progress, Review and Done in that order.
4. **Given** a board whose columns contain tickets, **When** the user views it, **Then** each column shows its tickets as cards in the server's order and each card shows key, title, type, priority and assignee (or an unassigned indicator).
5. **Given** a board with an empty column, **When** the user views it, **Then** the column is still shown, with an indication that it has no tickets.
6. **Given** the user reloads the browser while on a board, **When** the page loads again, **Then** the same board is shown (each board has its own address).
7. **Given** the address of a board that does not exist, **When** the user opens it, **Then** a clear "not found" message is shown with a way back to the board list.
8. **Given** the backend is unreachable or fails, **When** the user opens the board list or a board, **Then** the error is shown in place of the content with a way to retry.

---

### User Story 2 - Create boards and tickets (Priority: P2)

A team member creates a new board by naming it, and adds tickets to a board by giving at least a title, optionally a description, type, priority and assignee. New tickets appear at the bottom of To Do.

**Why this priority**: Once the team can see boards, the next most valuable thing is to put their own work in without touching the API directly.

**Independent Test**: Create a board with a new name, open it, create two tickets with different fields, and confirm both appear at the bottom of To Do with the values entered. Then attempt a duplicate board name (rejected by the server) and an empty ticket title (blocked before sending) and confirm the errors appear next to the offending fields with nothing created.

**Acceptance Scenarios**:

1. **Given** the board list or an open board, **When** the user creates a board with a valid name, **Then** the new board opens with four empty columns and is listed on the board list thereafter.
2. **Given** the user submits a board name that is already used, **When** the server rejects it, **Then** the server's message is shown next to the name field and no board is created.
3. **Given** an open board, **When** the user creates a ticket with only a title, **Then** the ticket appears at the bottom of To Do with type task, priority medium, no description and no assignee.
4. **Given** an open board, **When** the user creates a ticket with title, description, type, priority and assignee, **Then** the card shows the chosen type, priority and assignee, and the ticket detail shows the description.
5. **Given** the user submits a ticket with a value over its length limit, **When** the server rejects it, **Then** each rejected field shows the server's message beside it, the other entered values are kept, and no ticket is created.
7. **Given** the user submits a board name or ticket title that is empty or only whitespace, **When** they press submit, **Then** a "required" message appears beside that field, nothing is sent to the server, and the other entered values are kept.
6. **Given** the create form is submitted, **When** the request is in flight, **Then** the user cannot submit it twice, and the form closes or resets only after the server confirms success.

---

### User Story 3 - View and edit ticket details (Priority: P3)

A team member opens a ticket from its card and the ticket detail slides in as a drawer over the board, showing everything about it: key, title, description, type, priority, assignee, column, and when it was created and last updated. They can change title, description, type, priority and assignee and see the card on the board update behind the drawer.

**Why this priority**: Details and edits keep the board accurate as understanding of the work changes. They matter once there is something on the board.

**Independent Test**: Open a ticket from the board, confirm all fields are shown, change several fields, save, and confirm the detail and the card reflect the change after a reload. Then attempt an empty title and confirm a "required" message appears next to the title field without a request being sent, and attempt an over-length title and confirm the server's message appears there and the ticket is unchanged.

**Acceptance Scenarios**:

1. **Given** a card on the board, **When** the user opens it, **Then** the ticket detail opens as a drawer over the board (full screen on phone width) and shows key, title, description, type, priority, assignee, current column, creation time and last update time; closing the drawer returns to the board without reloading it.
2. **Given** the ticket detail, **When** the user changes any of title, description, type, priority or assignee in the edit form and presses Save, **Then** all changed fields are saved in one request, the saved values are shown, the last-update time changes, and the board card reflects the new values; pressing Cancel instead discards every unsaved change and shows the previous values.
3. **Given** the ticket detail, **When** the user clears the assignee or the description and saves, **Then** the ticket shows as unassigned or with no description respectively.
4. **Given** the user saves an edit with a too-long value, **When** the server rejects it, **Then** the message is shown next to the offending field and the ticket keeps its previous values; an empty or whitespace-only title is blocked before sending with a "required" message beside the title field.
5. **Given** the user reloads the browser while a ticket is open, **When** the page loads again, **Then** the same board is shown with the same ticket's drawer open (each ticket has its own address).
6. **Given** the address of a ticket key that does not exist or is malformed, **When** the user opens it, **Then** a clear message is shown with a way back.

---

### User Story 4 - Move and reorder tickets by dragging (Priority: P4)

A team member drags a card from one column to another to change its status, or drags it up or down within a column to change its priority order. The board immediately shows the new arrangement, and it persists.

**Why this priority**: Moving work across the board is the core kanban interaction, but it depends on having a board with tickets.

**Independent Test**: On a board with several tickets, drag one card to another column and another card to a new position in its column, reload, and confirm both changes persist in the right order. Simulate a server rejection and confirm the card returns to its original place with an error shown.

**Acceptance Scenarios**:

1. **Given** a card in To Do, **When** the user drags it into In Progress and drops it, **Then** the card appears in In Progress at the drop position, disappears from To Do, and the arrangement is the same after a reload.
2. **Given** a column with three cards, **When** the user drags the third card to the top, **Then** it is shown first, the other two follow in their previous order, and this order persists after a reload.
3. **Given** the user drops a card into an empty column, **When** the drop completes, **Then** the card becomes the column's only ticket.
4. **Given** the user starts dragging and drops the card back where it was, **When** the drop completes, **Then** nothing changes and no error is shown.
5. **Given** the server rejects the move or is unreachable, **When** the drop completes, **Then** the card returns to its original column and position and an error message is shown near the board.
6. **Given** a user who cannot drag (touch device, keyboard only), **When** they open a ticket's detail, **Then** they can choose a target column from there and the ticket moves to the bottom of that column.
7. **Given** a card was moved to another column, **When** the user opens the ticket, **Then** the detail shows the new column.

---

### User Story 5 - Comment on a ticket and see its history (Priority: P5)

A team member reads and adds comments on a ticket, and sees the ticket's column-change history: when it was created and each time it moved from one column to another.

**Why this priority**: Collaboration and traceability add value on top of a working board but are not required to track work.

**Independent Test**: Open a ticket, add a comment with author and text, confirm it appears at the end of the list with author and time. Move the ticket between columns and confirm the history shows the creation entry and each move in order.

**Acceptance Scenarios**:

1. **Given** a ticket with comments, **When** the user opens it, **Then** the comments are listed oldest first with author, text and time.
2. **Given** the ticket detail, **When** the user adds a comment with an author name and text, **Then** the comment appears at the end of the list and the form is cleared.
3. **Given** the user submits a comment with empty author or empty text, **When** they press submit, **Then** a "required" message appears next to the offending field, nothing is sent, and the entered values are kept; a value the server rejects (e.g. over its length limit) shows the server's message in the same place.
4. **Given** a ticket that was created in To Do and moved to In Progress then Review, **When** the user views its history, **Then** three entries are listed oldest first: creation into To Do, To Do → In Progress, In Progress → Review, each with its time.
5. **Given** a ticket that was only reordered within its column, **When** the user views its history, **Then** no extra entry appears.
6. **Given** a ticket with no comments, **When** the user opens it, **Then** the comments area says there are none yet and still offers the add-comment form.

---

### Edge Cases

- **EC-001**: The backend returns an unexpected failure (generic internal error) for any action: the app shows the server's message where the action was taken, leaves what the user typed intact, and does not pretend the action succeeded.
- **EC-002**: A validation error names a field the form does not display (or no field at all): the message is shown at the form level so it is never lost.
- **EC-003**: A board or ticket address is opened directly before the board list has ever been loaded: the page loads what it needs on its own.
- **EC-004**: Two browser tabs are open on the same board and one moves a ticket: the other tab shows the change only after reload (real-time updates are out of scope); if it then sends a move that is now out of range, the server's rejection is shown and the board is refreshed to the current server state.
- **EC-005**: Very long titles, descriptions or assignee names: cards and the detail view truncate or wrap without breaking the layout; the full text is visible in the detail.
- **EC-006**: A board with many tickets (around 200) in one column: the column scrolls; the page stays usable.
- **EC-007**: Narrow screens (phone width): the columns are laid out as a horizontally scrolling, snapping row where one full-width column is visible at a time and the user swipes between them; each column scrolls vertically on its own, no content is clipped, and the move-from-detail control (US4 scenario 6) is available because dragging between columns is impractical.
- **EC-008**: The user navigates away while a save is in flight: no duplicate submission is made and no stale success is shown.
- **EC-009**: Dropping a card at the very end of a column with existing tickets places it last; dropping at the top places it first.
- **EC-010**: The user drags a card and releases it outside any column: nothing changes.
- **EC-011**: A ticket's assignee is unassigned: cards and the detail show an explicit unassigned indicator rather than blank space.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST list all boards by name, show an empty state when there are none, and let the user open any board.
- **FR-002**: The app MUST let the user create a board by entering a name, from the header button on any page; on success the app MUST open the new board, which is listed on the board list thereafter. Validation and conflict errors MUST appear inside the create dialog regardless of the page it was opened from.
- **FR-003**: The board view MUST show the board's four columns in server order (To Do, In Progress, Review, Done) with each column's tickets as cards in server order; empty columns are still shown.
- **FR-004**: Each ticket card MUST show the ticket's key, title, type, priority and assignee (or an explicit unassigned indicator).
- **FR-005**: The app MUST let the user create a ticket on the open board with a required title and optional description, type, priority and assignee; the new card MUST appear at the bottom of To Do on success, with the server's defaults when optional fields were left out.
- **FR-006**: The app MUST let the user open a ticket from its card into a ticket detail drawer shown over the board (full screen on phone width), displaying key, title, description, type, priority, assignee, current column, creation time and last update time. Closing the drawer MUST return to the board without reloading it.
- **FR-007**: The app MUST let the user edit a ticket's title, description, type, priority and assignee in a single edit form with explicit Save and Cancel (no per-field inline saving), including clearing the description and the assignee. The drawer opens in view mode; an "Edit" button switches to the edit form pre-filled with the current values, and a successful Save and Cancel both return to view mode. Save MUST send one request containing only the changed fields; when no field changed, Save MUST send no request and MUST behave like Cancel. Cancel MUST discard unsaved changes; closing the drawer by any means (close button, Escape, backdrop, browser back) while editing discards unsaved changes without confirmation. Saved changes MUST be reflected in both the detail and the board card.
- **FR-008**: The app MUST let the user drag a card to another column at a chosen position, and drag a card to a new position within its column; the board MUST show the result immediately and the change MUST persist.
- **FR-009**: When a drag results in no change of column or position, the app MUST NOT send a move or show an error.
- **FR-010**: When the server rejects a move or cannot be reached, the app MUST return the card to its previous place instantly, with no animated return and no intermediate card style, show the server's message near the board, and refresh the board from the server when the rejection indicates the local view was stale; the previous board stays visible during that refresh.
- **FR-011**: The app MUST offer a non-drag way to move a ticket to another column from the ticket detail, placing it at the bottom of the chosen column. A rejected or failed move from the ticket detail MUST show the server's message inline beneath the move control; the board-level message of FR-010 is used only for drag-and-drop moves.
- **FR-012**: The app MUST list a ticket's comments oldest first with author, text and time, and let the user add a comment with author and text.
- **FR-013**: The app MUST show a ticket's column-change history oldest first, including the creation entry (no previous column) and one entry per column change with previous column, new column and time.
- **FR-014**: Every server error MUST be shown where the action happened, using the server's message: field-level validation messages next to the field they name, and all other errors (not found, conflict, invalid move, unexpected failure, unreachable server) at the level of the form, board or page concerned. Field messages whose field is not visible MUST fall back to the form level. A field error disappears when the user changes that field or resubmits; a form-level error disappears on the next submission; closing a dialog or leaving edit mode discards its errors and entered values; the board-level message persists until closed, until the next successful action on the board, or until the user leaves the board.
- **FR-015**: On a failed submission the app MUST keep the user's entered values so they can correct and resubmit.
- **FR-016**: While a create, edit, move or comment request is in flight the app MUST indicate it and MUST prevent a duplicate submission of the same action. The indication is: the submitting button is disabled and its label changes to "Creating…", "Saving…", "Moving…" or "Adding…"; a dragged card whose move request exceeds 300 ms shows the `saving` style (the design's muted ghost card, labelled "Saving move…") at its new position, and no indication appears for faster moves. While a move is committing, opening a ticket, creating a ticket and commenting remain available; a second drag and the move-from-detail control are ignored until the move completes; navigating away does not cancel the request and its result is dropped (EC-008).
- **FR-017**: Each board and each ticket MUST have its own address so reloading or sharing the address returns to the same view; a ticket's address opens its board with the ticket drawer already open. Opening an unknown or malformed address MUST show a clear message with a way back to the board list.
- **FR-018**: The app MUST show loading states while data is being fetched and MUST never present stale data as the result of an action that failed.
- **FR-019**: The app MUST be usable on desktop and on phone-width screens with all content reachable without clipping and touch-friendly controls. On phone width the four columns MUST be shown as a horizontally scrolling row with snap points, one full-width column visible at a time in the fixed column order, each column scrolling vertically on its own; the user MUST be able to tell which column is shown and that others exist.
- **FR-020**: The app MUST follow the visual design of the Stitch design (formerly referred to as "Stitch export"; see AS-002) for layout, colours, typography and component appearance; where the design has no screen for a view or state (board list, loading, empty, error, not found, phone width), the app MUST stay visually consistent with it.
- **FR-021**: The app MUST use only the backend operations documented in the existing contract and MUST NOT require any change to the backend.
- **FR-022**: Timestamps MUST be shown in a human-readable form in the user's local time.
- **FR-023**: Before submitting a form the app MUST block submission when a required field (board name, ticket title, comment author, comment text) is empty or only whitespace, showing a generic "required" message beside that field without contacting the server. The app MUST NOT perform any other client-side validation (no length limits, no uniqueness checks); all other rules are left to the server and shown per FR-014.
- **FR-024**: The app MUST meet the following accessibility baseline, which is a quality gate for every story:
  - When a dialog opens, focus moves to its first field; when the drawer opens, by card click or by direct address load, focus moves to its close button.
  - Closing the drawer returns focus to the card that opened it, or to the board heading after a direct load; closing a dialog returns focus to the button that opened it; after Save or Cancel focus moves to the "Edit" button; after a comment is added focus stays in the cleared author field.
  - Form-level errors, the board-level message and the inline comments/history errors are announced as alerts; "Required" and server field messages are announced through their field; pending controls are marked busy; a successful move from the detail is announced with the new column name.
  - A ticket card is one focusable element: a link to the ticket address whose accessible name is its key followed by its title; the same element carries the drag attributes.
  - Tabs use the tablist pattern with arrow-key navigation; the type and priority segmented controls are radio groups; icon-only buttons have text labels ("Close", "Clear assignee"); the phone-width column dots carry the column name as their label.
  - Keyboard focus is shown by a visible `primary` focus ring on every focusable element (the design's 1 px ring on inputs; a 2 px outline with 2 px offset on cards, buttons and links); every text/background pair, including badge pairs, meets a 4.5:1 contrast ratio.
  - When the user prefers reduced motion, the drawer slide-in, the skeleton pulse and the dragged card's tilt and scale are disabled; shadows and colours are unchanged.

### Key Entities

- **Board**: A named workspace shown in the board list; opening it shows its columns. Attributes shown: name, creation time.
- **Column**: One of the four fixed stages of a board (To Do, In Progress, Review, Done), shown in a fixed order, holding ordered ticket cards.
- **Ticket**: A unit of work shown as a card on the board and in full in the ticket detail. Attributes: key (TKT-n), title, description, type (bug, feature, task), priority (low, medium, high, critical), assignee (optional), column, position, creation time, last update time.
- **Comment**: A note on a ticket with author name, text and time, listed chronologically.
- **History Entry**: A record of a ticket entering a column: previous column (none for creation), new column and time, listed chronologically.
- **Server Error**: A failure reported by the backend with a code, a message and, for validation failures, a list of field-level messages; the app maps field messages to form fields and everything else to the surrounding area.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can create a board and its first ticket in under 1 minute without reading any documentation.
- **SC-002**: A board with 200 tickets is fully visible and interactive within 2 seconds of opening it against a locally running backend on a developer machine.
- **SC-003**: After a drag-and-drop, the card is shown in its new place within 100 ms of release, and the arrangement matches the server after reload in 100% of successful moves.
- **SC-004**: 100% of server validation errors that name a field are displayed next to that field, and 100% of other server errors are displayed within the form, board or page where the action was taken; none are silently dropped.
- **SC-005**: All five user stories can be completed on a 375-pixel-wide screen without any content being unreachable, reaching every column by horizontal swiping and moving tickets between columns through the ticket detail.
- **SC-006**: A reviewer comparing the board view and the ticket detail against the corresponding Stitch design screens, and the board list against the design's visual language, finds them visually consistent in layout, colour and typography.
- **SC-007**: The backend's committed contract and code are unchanged by this feature.

## Assumptions

- **AS-001**: The frontend is a new, self-contained application under `frontend/`; the backend under `backend/` and the contract under `specs/001-kanban-ticketing/contracts/` are consumed as they are and not modified.
- **AS-002**: The Stitch design is the design source for all screens. Its upstream is the live Stitch project `13486008395924154472` ("Kanban Ticketing UI Design System"), reached through the Stitch MCP integration configured in `.mcp.json` (requires `STITCH_API_KEY`); at the time of writing it holds two desktop screens: "Board View (API Compliant)" and "Ticket Detail Drawer & Modals (API Compliant)". The frozen snapshot under `specs/002-kanban-web-frontend/design/` (screens, tokens and design-system prose) is the reference for FR-020 and SC-006; the live project is consulted only when refreshing the snapshot. When sources disagree, spec and contracts win over the snapshot screens, which win over the design-system prose. Views and states the design does not cover (board list, loading, empty, error, not found, phone width) follow its visual language.
- **AS-003**: Out of scope: authentication, real-time updates (changes made elsewhere appear after reload), deleting boards, tickets or comments, editing or deleting comments, filtering, search, and customising columns.
- **AS-004**: There is one trusted team and no user identity; comment author and assignee are free-text names typed by the user.
- **AS-005**: The app relies on the backend for validation and displays its messages. The only client-side check is the required-field check in FR-023; length limits, uniqueness and every other rule are enforced by the server and its rejection is displayed as specified in FR-014.
- **AS-006**: Type defaults to task and priority to medium when the user leaves them unset, matching the backend defaults.
- **AS-007**: The move-from-detail control (FR-011) places the ticket at the bottom of the target column; fine-grained positioning without dragging is not required.
- **AS-008**: The app shows the server's error messages as given and adds no wording to them. The only client-authored messages are "Required" (FR-023), "Could not reach the server." (no response), "Unexpected response from the server (<status>)." (unparseable response) and the not-found/empty-state copy of FR-001 and FR-017.
- **AS-009**: The app runs against the local backend only, from the origin the backend already allows for the local frontend.
- **AS-010**: Standard current desktop and mobile browsers are supported; no legacy browser support is required.
