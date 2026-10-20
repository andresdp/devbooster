# Feature Specification: Kanban Ticketing System

**Feature Branch**: `001-kanban-ticketing`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "A kanban-style ticketing system for software teams. A board has columns (default: To Do, In Progress, Review, Done). A ticket has a title, description, type (bug, feature, task), priority, assignee and a human-readable key like TKT-12. P1: create boards and tickets, and view them grouped by column. P2: move tickets between columns and reorder them within a column. P3: comments on tickets and a history of status changes. Out of scope: authentication, notifications, attachments, real-time updates."

## Clarifications

### Session 2026-10-20

- Q: Should ticket positions be counted from 0 or from 1? → A: Zero-based (top = 0)
- Q: Which ticket fields are required at creation? → A: Only the title; defaults are type = task, priority = medium, description = empty, assignee = unassigned
- Q: Does whitespace-only text count as empty? → A: Yes; surrounding whitespace is trimmed and values empty after trimming are rejected

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create boards and tickets, view them by column (Priority: P1)

A team member creates a board for their project and adds tickets to it. Each ticket captures a title, description, type (bug, feature or task), priority and assignee, and receives a human-readable key (for example TKT-12). The team member opens the board and sees every ticket grouped under the board's columns (To Do, In Progress, Review, Done by default).

**Why this priority**: Without boards and tickets that can be seen on a board, there is no product. This slice alone is a usable MVP: a team can record work and see it laid out.

**Independent Test**: Create a board, create several tickets of different types and priorities, then open the board and confirm each ticket appears under the correct column with its key and details.

**Acceptance Scenarios**:

1. **Given** no boards exist, **When** a user creates a board with a name, **Then** the board exists with the four default columns (To Do, In Progress, Review, Done) in that order and is empty.
2. **Given** an existing board, **When** a user creates a ticket with at least a title, **Then** the ticket is placed in the first column (To Do) and is assigned a unique human-readable key such as TKT-1.
3. **Given** several tickets have been created, **When** a user creates another, **Then** its key is the next number in sequence and never repeats or reuses an earlier key.
4. **Given** a board with tickets in different columns, **When** a user views the board, **Then** tickets are shown grouped by column, in column order, with each ticket's key, title, type, priority and assignee visible.
5. **Given** a user submits a ticket without a title, or with a type outside bug/feature/task, **When** they try to create it, **Then** the request is rejected with a clear error and no ticket is created.
6. **Given** an existing ticket, **When** a user opens it by its key, **Then** they see its full details including the description.

---

### User Story 2 - Move and reorder tickets (Priority: P2)

A team member moves a ticket from one column to another as work progresses (for example from To Do to In Progress) and reorders tickets within a column to express which should be handled first.

**Why this priority**: Moving work across columns is the core kanban behavior, but it only matters once boards and tickets exist.

**Independent Test**: With a board containing several tickets, move one ticket to another column and reorder tickets within a column, then reload the board and confirm the new column and order persist.

**Acceptance Scenarios**:

1. **Given** a ticket in To Do, **When** a user moves it to In Progress, **Then** the ticket appears in In Progress and no longer in To Do.
2. **Given** a column with three tickets, **When** a user moves the third ticket to the top position, **Then** the column shows it first and the other two follow in their previous relative order.
3. **Given** a ticket is moved into a column that already has tickets, **When** the user specifies a position, **Then** the ticket is inserted at that position; if no position is given it is placed at the bottom.
4. **Given** a user tries to move a ticket to a column that does not belong to its board, or to a position outside the column's range, **When** they submit the move, **Then** it is rejected with a clear error and the ticket stays where it was.
5. **Given** the order of tickets in a column was changed, **When** the board is viewed again later, **Then** the same order is shown.

---

### User Story 3 - Comments and status-change history (Priority: P3)

A team member adds comments to a ticket to discuss it, and can see a history of the ticket's status changes (which column it moved from and to, and when).

**Why this priority**: Collaboration and traceability add value on top of a working board but are not required to track work.

**Independent Test**: Add comments to a ticket, move it across several columns, then open the ticket and confirm comments and the ordered history of moves are shown.

**Acceptance Scenarios**:

1. **Given** an existing ticket, **When** a user adds a comment with text and an author name, **Then** the comment is saved and shown on the ticket in chronological order.
2. **Given** a user submits an empty comment, **When** they try to add it, **Then** it is rejected with a clear error.
3. **Given** a ticket that has been moved from To Do to In Progress and then to Review, **When** a user views its history, **Then** they see two entries, each with the previous column, the new column and the time of the change, in chronological order.
4. **Given** a ticket is only reordered within the same column, **When** its history is viewed, **Then** no status-change entry is added.
5. **Given** a newly created ticket, **When** its history is viewed, **Then** it contains an entry recording its creation in its starting column.

---

### Edge Cases

- Creating a ticket on a board or opening a ticket key that does not exist returns a clear "not found" error.
- Two tickets created at nearly the same moment still receive distinct keys.
- Moving a ticket to the column it is already in at a different position is a reorder, not a status change.
- Deleting is not part of the request; behavior for removing boards, tickets or comments is not defined in this feature.
- Very long titles or descriptions beyond a stated limit are rejected with a clear error rather than silently truncated.
- Creating a board with a name that is empty or already used by another board is rejected.
- A ticket with no assignee is valid; the assignee is simply shown as unassigned.
- Viewing an empty board shows all columns with no tickets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a board with a name, and MUST reject empty or duplicate board names.
- **FR-002**: System MUST create every new board with the default columns To Do, In Progress, Review and Done, in that order.
- **FR-003**: System MUST allow users to list boards and retrieve a single board.
- **FR-004**: System MUST allow users to create a ticket on a board with a title (required) and optional description, type, priority and assignee. When omitted, type defaults to task, priority to medium, description to empty and assignee to unassigned.
- **FR-005**: System MUST restrict ticket type to bug, feature or task, and priority to a fixed set of levels (low, medium, high, critical), rejecting other values.
- **FR-006**: System MUST require a non-empty title for every ticket and reject tickets without one.
- **FR-007**: System MUST assign each ticket a unique, human-readable key of the form TKT-<number>, with numbers increasing in creation order; a key MUST never change or be reused.
- **FR-008**: System MUST place a newly created ticket at the bottom of the board's first column.
- **FR-009**: System MUST let users view a board with its tickets grouped by column, with columns in board order and tickets in their column order.
- **FR-010**: System MUST let users retrieve a single ticket by its key, including all of its details.
- **FR-011**: System MUST let users edit a ticket's title, description, type, priority and assignee, applying the same validation as at creation.
- **FR-012**: System MUST let users move a ticket to any column of the same board at an optional position, defaulting to the bottom of the target column. Positions are zero-based (top = 0); for a different column the valid range is 0 to the number of tickets already in it (the upper bound appends at the bottom).
- **FR-013**: System MUST let users reorder a ticket within its current column by specifying a new zero-based position, valid from 0 to the number of tickets in the column minus 1.
- **FR-014**: System MUST keep ticket order within each column consistent and gap-free after any move or reorder, and MUST persist it.
- **FR-015**: System MUST reject moves to columns of a different board or to positions outside the valid range, leaving state unchanged.
- **FR-016**: System MUST let users add a comment (non-empty text and author name) to a ticket and list a ticket's comments in chronological order.
- **FR-017**: System MUST record a history entry (previous column, new column, timestamp) every time a ticket changes column, and an entry when a ticket is created.
- **FR-018**: System MUST NOT record a history entry for reordering within the same column.
- **FR-019**: System MUST let users view a ticket's history in chronological order.
- **FR-020**: System MUST persist all boards, tickets, comments and history so they survive restarts.
- **FR-021**: System MUST respond to every invalid request with a consistent, clear error that identifies what was wrong.

### Key Entities

- **Board**: A named workspace for a team's tickets. Has an ordered list of columns.
- **Column**: A named stage on a board (default: To Do, In Progress, Review, Done) with a fixed position among the board's columns. Holds an ordered list of tickets.
- **Ticket**: A unit of work on a board. Has a human-readable key (TKT-n), title, description, type (bug, feature, task), priority, optional assignee, current column and position within that column, and creation/update times.
- **Comment**: A text note on a ticket with an author name and creation time.
- **History Entry**: A record of a ticket's status change: ticket, previous column (none for creation), new column, and time of change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a board and its first ticket in under 1 minute.
- **SC-002**: 100% of created tickets receive a distinct key, with no duplicates across at least 1,000 tickets.
- **SC-003**: A board with 200 tickets displays fully grouped by column in under 2 seconds.
- **SC-004**: After any sequence of moves and reorders, reloading the board shows exactly the order the user last set, in 100% of cases.
- **SC-005**: A user can move a ticket to another column in a single action, in under 10 seconds.
- **SC-006**: Every column change of a ticket is visible in its history, with no missing or extra entries, in 100% of cases.
- **SC-007**: 100% of invalid submissions (missing title, unknown type or priority, invalid move target) are rejected with an error message that states the problem, and leave existing data unchanged.

## Assumptions

- Users are members of one trusted software team; there is no login, accounts or permissions (authentication is out of scope). Comment authors and assignees are free-text names.
- Out of scope: authentication, notifications, attachments, and real-time updates. Users see changes by reloading the board.
- Default columns are fixed for this feature; customizing, adding, renaming or reordering columns is not included.
- Priority levels are low, medium, high and critical; the request named priority without listing values, so these common levels are assumed.
- Ticket keys use a single global TKT-<number> sequence shared across all boards, so a key identifies a ticket on its own.
- Deleting boards, tickets or comments, and editing or deleting comments, are not part of this feature.
- Title length limit of 200 characters and description limit of 10,000 characters are assumed.
- Board names are unique, compared case-insensitively.
- For board names, ticket titles, comment text and author names, leading and trailing whitespace is trimmed before validation and storage; a value that is empty after trimming is treated as empty and rejected.
