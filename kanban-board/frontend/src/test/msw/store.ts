import type {
  BoardDetail,
  BoardSummary,
  ColumnWithTickets,
  Comment,
  ErrorDetail,
  HistoryEntry,
  Ticket,
} from "../../api/types";
import { PRIORITIES, TICKET_TYPES } from "../../api/types";
import { sampleBoard, type Seed } from "./fixtures";

export interface Store {
  boards: BoardSummary[];
  columns: { id: number; board_id: number; name: string; position: number }[];
  tickets: Ticket[];
  comments: Comment[];
  history: HistoryEntry[];
  nextTicketId: number;
  nextBoardId: number;
  nextColumnId: number;
  nextCommentId: number;
  nextHistoryId: number;
  boardDetail(id: number): BoardDetail | undefined;
  moveTicket(key: string, columnId: number, position: number | null | undefined): Ticket;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

export function createStore(seed: Seed = sampleBoard()): Store {
  const { board } = seed;
  const tickets = board.columns.flatMap((c) => c.tickets.map((t) => ({ ...t })));
  const store: Store = {
    boards: [{ id: board.id, name: board.name, created_at: board.created_at }],
    columns: board.columns.map((c) => ({
      id: c.id,
      board_id: board.id,
      name: c.name,
      position: c.position,
    })),
    tickets,
    comments: seed.comments.map((c) => ({ ...c })),
    history: seed.history.map((h) => ({ ...h })),
    nextTicketId: Math.max(0, ...tickets.map((t) => Number(t.key.slice(4)))) + 1,
    nextBoardId: board.id + 1,
    nextColumnId: Math.max(0, ...board.columns.map((c) => c.id)) + 1,
    nextCommentId: Math.max(0, ...seed.comments.map((c) => c.id)) + 1,
    nextHistoryId: Math.max(0, ...seed.history.map((h) => h.id)) + 1,
    boardDetail(id) {
      const summary = store.boards.find((b) => b.id === id);
      if (!summary) return undefined;
      const columns: ColumnWithTickets[] = store.columns
        .filter((c) => c.board_id === id)
        .sort(byPosition)
        .map((c) => ({
          id: c.id,
          name: c.name,
          position: c.position,
          tickets: store.tickets
            .filter((t) => t.column_id === c.id)
            .sort(byPosition)
            .map((t) => ({ ...t })),
        }));
      return { ...summary, columns };
    },
    moveTicket(key, columnId, position) {
      const ticket = store.tickets.find((t) => t.key === key);
      if (!ticket) throw new Error(`unknown ticket ${key}`);
      const sourceId = ticket.column_id;
      const sameColumn = sourceId === columnId;
      const target = store.tickets
        .filter((t) => t.column_id === columnId && t.key !== key)
        .sort(byPosition);
      const index = position ?? target.length;
      if (sameColumn && index === ticket.position) return ticket;

      target.splice(index, 0, ticket);
      target.forEach((t, i) => {
        t.position = i;
      });
      ticket.column_id = columnId;
      if (!sameColumn) {
        store.tickets
          .filter((t) => t.column_id === sourceId)
          .sort(byPosition)
          .forEach((t, i) => {
            t.position = i;
          });
        const columnName = (id: number) => store.columns.find((c) => c.id === id)?.name ?? "";
        store.history.push({
          id: store.nextHistoryId++,
          ticket_key: key,
          from_column: { id: sourceId, name: columnName(sourceId) },
          to_column: { id: columnId, name: columnName(columnId) },
          changed_at: new Date().toISOString(),
        });
      }
      ticket.updated_at = new Date().toISOString();
      return ticket;
    },
  };
  return store;
}

type Body = Record<string, unknown>;

function checkString(
  details: ErrorDetail[],
  body: Body,
  field: string,
  { required, max }: { required: boolean; max: number },
): void {
  const value = body[field];
  if (value === undefined || value === null) {
    if (required) details.push({ field, message: `${field} is required` });
    return;
  }
  if (typeof value !== "string") {
    details.push({ field, message: `${field} must be a string` });
    return;
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    details.push({ field, message: `${field} must not be empty` });
  } else if (value.length > max) {
    details.push({ field, message: `${field} must be at most ${max} characters` });
  }
}

function checkEnum(
  details: ErrorDetail[],
  body: Body,
  field: string,
  allowed: readonly string[],
): void {
  const value = body[field];
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    details.push({ field, message: `${field} must be one of: ${allowed.join(", ")}` });
  }
}

function unknownFields(details: ErrorDetail[], body: Body, known: readonly string[]): void {
  for (const field of Object.keys(body)) {
    if (!known.includes(field)) details.push({ field, message: "Extra inputs are not permitted" });
  }
}

export function validateBoardCreate(body: Body): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  unknownFields(details, body, ["name"]);
  const name = body.name;
  if (typeof name !== "string" || name.trim().length === 0) {
    details.push({ field: "name", message: "name must not be empty" });
  } else if (name.trim().length > 100) {
    details.push({ field: "name", message: "name must be at most 100 characters" });
  }
  return details;
}

export function validateTicketCreate(body: Body): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  unknownFields(details, body, ["title", "description", "type", "priority", "assignee"]);
  checkString(details, body, "title", { required: true, max: 200 });
  checkString(details, body, "description", { required: false, max: 10_000 });
  checkString(details, body, "assignee", { required: false, max: 100 });
  checkEnum(details, body, "type", TICKET_TYPES);
  checkEnum(details, body, "priority", PRIORITIES);
  return details;
}

export function validateTicketUpdate(body: Body): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  unknownFields(details, body, ["title", "description", "type", "priority", "assignee"]);
  if (Object.keys(body).length === 0) {
    details.push({ field: "body", message: "At least one field must be provided" });
  }
  if ("title" in body) checkString(details, body, "title", { required: true, max: 200 });
  checkString(details, body, "description", { required: false, max: 10_000 });
  checkString(details, body, "assignee", { required: false, max: 100 });
  checkEnum(details, body, "type", TICKET_TYPES);
  checkEnum(details, body, "priority", PRIORITIES);
  return details;
}

export function validateCommentCreate(body: Body): ErrorDetail[] {
  const details: ErrorDetail[] = [];
  unknownFields(details, body, ["author", "text"]);
  checkString(details, body, "author", { required: true, max: 100 });
  checkString(details, body, "text", { required: true, max: 5_000 });
  return details;
}
