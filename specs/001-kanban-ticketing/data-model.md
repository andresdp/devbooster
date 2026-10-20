# Data Model: Kanban Ticketing System

All tables are SQLModel models in SQLite. Timestamps are UTC, stored as timezone-aware ISO-8601 in API responses.

## Board

| Field | Type | Rules |
|-------|------|-------|
| id | int, PK | |
| name | str | Trimmed, non-empty, max 100 |
| name_key | str, unique | `name.lower()`; enforces case-insensitive uniqueness (FR-001) |
| created_at | datetime | Set on create |

Relations: has 4 `Column`s (created together with the board), many `Ticket`s via columns.

## Column

| Field | Type | Rules |
|-------|------|-------|
| id | int, PK | |
| board_id | int, FK → Board | |
| name | str | Default set: To Do, In Progress, Review, Done |
| position | int | Zero-based order among the board's columns; unique per board; fixed in this feature |

Relations: holds ordered `Ticket`s.

## Ticket

| Field | Type | Rules |
|-------|------|-------|
| id | int, PK AUTOINCREMENT | Never reused (FR-007) |
| key | derived | `TKT-{id}`, exposed in API, not stored |
| board_id | int, FK → Board | Set at creation, immutable |
| column_id | int, FK → Column | Must belong to `board_id` |
| position | int | Zero-based, gap-free within the column (FR-014) |
| title | str | Trimmed, 1–200 chars, required |
| description | str | Trimmed, 0–10,000 chars, default "" |
| type | enum | `bug` \| `feature` \| `task`, default `task` |
| priority | enum | `low` \| `medium` \| `high` \| `critical`, default `medium` |
| assignee | str \| null | Trimmed free text; empty/absent means unassigned (null) |
| created_at / updated_at | datetime | `updated_at` changes on edit and move |

Indexes: `(column_id, position)` for ordered reads.

## Comment

| Field | Type | Rules |
|-------|------|-------|
| id | int, PK | |
| ticket_id | int, FK → Ticket | |
| author | str | Trimmed, non-empty, max 100 |
| text | str | Trimmed, non-empty, max 5,000 |
| created_at | datetime | Listing ordered by `created_at, id` ascending |

## HistoryEntry

| Field | Type | Rules |
|-------|------|-------|
| id | int, PK | |
| ticket_id | int, FK → Ticket | |
| from_column_id | int \| null, FK → Column | Null for the creation entry |
| to_column_id | int, FK → Column | |
| changed_at | datetime | Listing ordered by `changed_at, id` ascending |

API responses also include the column names (`from_column`, `to_column`) for readability.

## Relationships

```text
Board 1 ── 4 Column 1 ── * Ticket 1 ── * Comment
                              └──── * HistoryEntry (from/to → Column)
```

## State transitions and invariants

- **Create ticket**: placed at `position = count(first column)`; writes HistoryEntry(from=null, to=first column).
- **Move to a different column** (same board): valid position `0..n` where n = tickets already in the target (default n). Source column is closed up, target shifted, both left gap-free; writes HistoryEntry(from, to).
- **Reorder in the same column**: valid position `0..n-1`; only positions change; no HistoryEntry (FR-018).
- **Invalid move** (other board's column, unknown column, out-of-range position): 422, nothing changes; the whole operation is one transaction.
- **Edit ticket**: title, description, type, priority, assignee only; same validation as create; never alters key, board, column or position.
- Invariant: for every column, positions are exactly `0..n-1` with no duplicates after every committed operation.
