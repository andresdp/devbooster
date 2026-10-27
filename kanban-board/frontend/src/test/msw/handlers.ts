import { HttpResponse, http } from "msw";
import type { BoardCreated, Comment, ErrorDetail, ErrorResponse, Ticket } from "../../api/types";
import {
  createStore,
  validateBoardCreate,
  validateCommentCreate,
  validateTicketCreate,
  validateTicketUpdate,
  type Store,
} from "./store";

const API = "http://localhost:8000/api/v1";
const KEY_PATTERN = /^[A-Za-z]+-\d+$/;

export let store: Store = createStore();

export function resetStore(): void {
  store = createStore();
}

function error(
  status: number,
  code: string,
  message: string,
  details: ErrorDetail[] | null = null,
) {
  const body: ErrorResponse = { error: { code, message, details } };
  return HttpResponse.json(body, { status });
}

const validation = (details: ErrorDetail[]) =>
  error(422, "validation_error", "Request validation failed", details);

const notFound = (what: string) => error(404, "not_found", `${what} not found`);

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const data: unknown = await request.json();
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function parseBoardId(raw: string | readonly string[] | undefined): number | undefined {
  return typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : undefined;
}

function findTicket(raw: string | readonly string[] | undefined): Ticket | "malformed" | undefined {
  const key = typeof raw === "string" ? raw : "";
  if (!KEY_PATTERN.test(key)) return "malformed";
  return store.tickets.find((t) => t.key === key);
}

const malformedKey = () =>
  validation([{ field: "key", message: "Ticket key must look like TKT-1" }]);

const blankToNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

export const handlers = [
  http.get(`${API}/boards`, () => HttpResponse.json(store.boards)),

  http.post(`${API}/boards`, async ({ request }) => {
    const body = await readBody(request);
    const details = validateBoardCreate(body);
    if (details.length > 0) return validation(details);
    const name = (body.name as string).trim();
    if (store.boards.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      return error(409, "conflict", "A board with this name already exists");
    }
    const created_at = new Date().toISOString();
    const id = store.nextBoardId++;
    store.boards.push({ id, name, created_at });
    const columns = ["To Do", "In Progress", "Review", "Done"].map((columnName, position) => ({
      id: store.nextColumnId++,
      name: columnName,
      position,
    }));
    columns.forEach((c) => store.columns.push({ ...c, board_id: id }));
    const result: BoardCreated = { id, name, created_at, columns };
    return HttpResponse.json(result, { status: 201 });
  }),

  http.get(`${API}/boards/:boardId`, ({ params }) => {
    const id = parseBoardId(params.boardId);
    if (id === undefined) {
      return validation([{ field: "board_id", message: "board_id must be an integer" }]);
    }
    const detail = store.boardDetail(id);
    return detail ? HttpResponse.json(detail) : notFound("Board");
  }),

  http.post(`${API}/boards/:boardId/tickets`, async ({ params, request }) => {
    const boardId = parseBoardId(params.boardId);
    if (boardId === undefined) {
      return validation([{ field: "board_id", message: "board_id must be an integer" }]);
    }
    const detail = store.boardDetail(boardId);
    if (!detail) return notFound("Board");
    const body = await readBody(request);
    const details = validateTicketCreate(body);
    if (details.length > 0) return validation(details);
    const first = detail.columns[0];
    if (!first) return notFound("Column");
    const now = new Date().toISOString();
    const ticket: Ticket = {
      key: `TKT-${store.nextTicketId++}`,
      board_id: boardId,
      column_id: first.id,
      position: first.tickets.length,
      title: (body.title as string).trim(),
      description: typeof body.description === "string" ? body.description : "",
      type: (body.type as Ticket["type"] | undefined) ?? "task",
      priority: (body.priority as Ticket["priority"] | undefined) ?? "medium",
      assignee: blankToNull(body.assignee),
      created_at: now,
      updated_at: now,
    };
    store.tickets.push(ticket);
    store.history.push({
      id: store.nextHistoryId++,
      ticket_key: ticket.key,
      from_column: null,
      to_column: { id: first.id, name: first.name },
      changed_at: now,
    });
    return HttpResponse.json(ticket, { status: 201 });
  }),

  http.get(`${API}/tickets/:key`, ({ params }) => {
    const ticket = findTicket(params.key);
    if (ticket === "malformed") return malformedKey();
    return ticket ? HttpResponse.json(ticket) : notFound("Ticket");
  }),

  http.patch(`${API}/tickets/:key`, async ({ params, request }) => {
    const ticket = findTicket(params.key);
    if (ticket === "malformed") return malformedKey();
    const body = await readBody(request);
    const details = validateTicketUpdate(body);
    if (details.length > 0) return validation(details);
    if (!ticket) return notFound("Ticket");
    if (typeof body.title === "string") ticket.title = body.title.trim();
    if (typeof body.description === "string") ticket.description = body.description;
    if (typeof body.type === "string") ticket.type = body.type as Ticket["type"];
    if (typeof body.priority === "string") ticket.priority = body.priority as Ticket["priority"];
    if ("assignee" in body) ticket.assignee = blankToNull(body.assignee);
    ticket.updated_at = new Date().toISOString();
    return HttpResponse.json(ticket);
  }),

  http.post(`${API}/tickets/:key/move`, async ({ params, request }) => {
    const ticket = findTicket(params.key);
    if (ticket === "malformed") return malformedKey();
    const body = await readBody(request);
    const { column_id, position } = body;
    const details: ErrorDetail[] = [];
    if (!Number.isInteger(column_id)) {
      details.push({ field: "column_id", message: "column_id must be an integer" });
    }
    if (
      position !== undefined &&
      position !== null &&
      !(Number.isInteger(position) && (position as number) >= 0)
    ) {
      details.push({ field: "position", message: "position must be a non-negative integer" });
    }
    if (details.length > 0) return validation(details);
    if (!ticket) return notFound("Ticket");

    const column = store.columns.find((c) => c.id === column_id && c.board_id === ticket.board_id);
    if (!column) return error(422, "invalid_move", "Column does not belong to the ticket's board");
    const targetCount = store.tickets.filter((t) => t.column_id === column.id).length;
    const sameColumn = ticket.column_id === column.id;
    const max = sameColumn ? targetCount - 1 : targetCount;
    if (typeof position === "number" && position > max) {
      return error(422, "invalid_move", `position must be between 0 and ${max}`);
    }
    const moved = store.moveTicket(ticket.key, column.id, position as number | null | undefined);
    return HttpResponse.json(moved);
  }),

  http.get(`${API}/tickets/:key/comments`, ({ params }) => {
    const ticket = findTicket(params.key);
    if (ticket === "malformed") return malformedKey();
    if (!ticket) return notFound("Ticket");
    return HttpResponse.json(store.comments.filter((c) => c.ticket_key === ticket.key));
  }),

  http.post(`${API}/tickets/:key/comments`, async ({ params, request }) => {
    const ticket = findTicket(params.key);
    if (ticket === "malformed") return malformedKey();
    const body = await readBody(request);
    const details = validateCommentCreate(body);
    if (details.length > 0) return validation(details);
    if (!ticket) return notFound("Ticket");
    const comment: Comment = {
      id: store.nextCommentId++,
      ticket_key: ticket.key,
      author: (body.author as string).trim(),
      text: (body.text as string).trim(),
      created_at: new Date().toISOString(),
    };
    store.comments.push(comment);
    return HttpResponse.json(comment, { status: 201 });
  }),

  http.get(`${API}/tickets/:key/history`, ({ params }) => {
    const ticket = findTicket(params.key);
    if (ticket === "malformed") return malformedKey();
    if (!ticket) return notFound("Ticket");
    return HttpResponse.json(store.history.filter((h) => h.ticket_key === ticket.key));
  }),
];
