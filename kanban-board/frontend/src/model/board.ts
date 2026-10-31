import type { BoardDetail, ColumnWithTickets, Ticket, TicketMove } from "../api/types";

/** Columns sorted by `position`; the input is not mutated and ticket order is the server's. */
export function columnOrder(board: BoardDetail): ColumnWithTickets[] {
  return [...board.columns].sort((a, b) => a.position - b.position);
}

export function findTicket(
  board: BoardDetail,
  key: string,
): { ticket: Ticket; column: ColumnWithTickets } | undefined {
  for (const column of board.columns) {
    const ticket = column.tickets.find((t) => t.key === key);
    if (ticket) return { ticket, column };
  }
  return undefined;
}

/** Optimistic move: removes the ticket from its column and inserts it at `toIndex` in the target. */
export function applyMove(
  board: BoardDetail,
  key: string,
  toColumnId: number,
  toIndex: number,
): BoardDetail {
  const found = findTicket(board, key);
  if (!found) return board;
  const moved: Ticket = { ...found.ticket, column_id: toColumnId };
  const columns = board.columns.map((column) => {
    let tickets = column.tickets.filter((t) => t.key !== key);
    if (column.id === toColumnId) {
      const index = Math.max(0, Math.min(toIndex, tickets.length));
      tickets = [...tickets.slice(0, index), moved, ...tickets.slice(index)];
    }
    if (column.id !== toColumnId && column.id !== found.column.id) return column;
    return { ...column, tickets: tickets.map((t, i) => ({ ...t, position: i })) };
  });
  return { ...board, columns };
}

/** Request body for a move, or null when column and index are unchanged (FR-009). */
export function movePayload(
  board: BoardDetail,
  key: string,
  toColumnId: number,
  toIndex: number,
): TicketMove | null {
  const found = findTicket(board, key);
  if (!found) return null;
  const fromIndex = found.column.tickets.findIndex((t) => t.key === key);
  if (found.column.id === toColumnId && fromIndex === toIndex) return null;
  return { column_id: toColumnId, position: toIndex };
}
