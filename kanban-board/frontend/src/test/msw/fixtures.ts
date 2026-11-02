import type {
  BoardDetail,
  ColumnWithTickets,
  Comment,
  HistoryEntry,
  Priority,
  Ticket,
  TicketType,
} from "../../api/types";

export interface Seed {
  board: BoardDetail;
  comments: Comment[];
  history: HistoryEntry[];
}

const COLUMN_NAMES = ["To Do", "In Progress", "Review", "Done"] as const;
const CREATED = "2026-10-20T10:00:00Z";

function ticket(
  n: number,
  column: ColumnWithTickets,
  position: number,
  type: TicketType,
  priority: Priority,
  assignee: string | null,
  title: string,
): Ticket {
  return {
    key: `TKT-${n}`,
    board_id: 1,
    column_id: column.id,
    position,
    title,
    description: `Description of ${title}`,
    type,
    priority,
    assignee,
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function emptyColumns(): ColumnWithTickets[] {
  return COLUMN_NAMES.map((name, i) => ({ id: i + 1, name, position: i, tickets: [] }));
}

export function sampleBoard(): Seed {
  const columns = emptyColumns();
  const [todo, progress, review] = columns as [
    ColumnWithTickets,
    ColumnWithTickets,
    ColumnWithTickets,
  ];
  todo.tickets.push(
    ticket(1, todo, 0, "task", "low", "Ada Lovelace", "Set up the repository"),
    ticket(2, todo, 1, "bug", "high", null, "Fix login redirect"),
    ticket(4, todo, 2, "feature", "medium", "Grace Hopper", "Add board filters"),
  );
  progress.tickets.push(
    ticket(5, progress, 0, "feature", "critical", "Alan Turing", "Implement drag and drop"),
    ticket(6, progress, 1, "task", "medium", "Ada Lovelace", "Write the API client"),
  );
  review.tickets.push(
    ticket(3, review, 0, "bug", "high", "Grace Hopper", "Card overflows on narrow screens"),
    ticket(7, review, 1, "task", "low", "Alan Turing", "Document the setup"),
  );
  return {
    board: { id: 1, name: "Sample Project", created_at: CREATED, columns },
    comments: [
      {
        id: 1,
        ticket_key: "TKT-3",
        author: "Grace Hopper",
        text: "Reproduced on a 320px viewport.",
        created_at: "2026-10-20T11:00:00Z",
      },
      {
        id: 2,
        ticket_key: "TKT-3",
        author: "Ada Lovelace",
        text: "Fix is in review.",
        created_at: "2026-10-20T12:30:00Z",
      },
    ],
    history: [
      {
        id: 1,
        ticket_key: "TKT-3",
        from_column: null,
        to_column: { id: 1, name: "To Do" },
        changed_at: CREATED,
      },
      {
        id: 2,
        ticket_key: "TKT-3",
        from_column: { id: 1, name: "To Do" },
        to_column: { id: 2, name: "In Progress" },
        changed_at: "2026-10-20T10:30:00Z",
      },
      {
        id: 3,
        ticket_key: "TKT-3",
        from_column: { id: 2, name: "In Progress" },
        to_column: { id: 3, name: "Review" },
        changed_at: "2026-10-20T11:30:00Z",
      },
    ],
  };
}

/** One board with `n` tickets in To Do (EC-006). */
export function createLargeBoard(n = 200): Seed {
  const columns = emptyColumns();
  const [todo] = columns as [ColumnWithTickets, ...ColumnWithTickets[]];
  for (let i = 0; i < n; i++) {
    todo.tickets.push(ticket(i + 1, todo, i, "task", "medium", null, `Ticket number ${i + 1}`));
  }
  return {
    board: { id: 1, name: "Large Project", created_at: CREATED, columns },
    comments: [],
    history: [],
  };
}
