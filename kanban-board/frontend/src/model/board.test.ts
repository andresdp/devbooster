import { describe, expect, it } from "vitest";
import { sampleBoard } from "../test/msw/fixtures";
import { applyMove, columnOrder, findTicket, movePayload } from "./board";

describe("columnOrder", () => {
  it("returns columns sorted by position without mutating the input", () => {
    const { board } = sampleBoard();
    const [a, b, c, d] = board.columns as [
      (typeof board.columns)[number],
      (typeof board.columns)[number],
      (typeof board.columns)[number],
      (typeof board.columns)[number],
    ];
    board.columns = [c, a, d, b];
    const result = columnOrder(board);
    expect(result.map((col) => col.name)).toEqual(["To Do", "In Progress", "Review", "Done"]);
    expect(board.columns.map((col) => col.id)).toEqual([c.id, a.id, d.id, b.id]);
    expect(result).not.toBe(board.columns);
  });

  it("leaves tickets in server order", () => {
    const { board } = sampleBoard();
    const todo = columnOrder(board)[0];
    expect(todo?.tickets.map((t) => t.key)).toEqual(["TKT-1", "TKT-2", "TKT-4"]);
  });
});

describe("findTicket", () => {
  it("returns the ticket and its column for a key on the board", () => {
    const board = sampleBoard().board;
    const found = findTicket(board, "TKT-3");
    expect(found?.ticket.title).toBe("Card overflows on narrow screens");
    expect(found?.column.name).toBe("Review");
  });

  it("returns undefined for an unknown key", () => {
    expect(findTicket(sampleBoard().board, "TKT-99999")).toBeUndefined();
  });
});

describe("applyMove", () => {
  const keys = (board: ReturnType<typeof sampleBoard>["board"], columnId: number) =>
    board.columns.find((c) => c.id === columnId)!.tickets.map((t) => `${t.key}@${t.position}`);

  it("moves across columns, renumbering both and setting column_id", () => {
    const { board } = sampleBoard();
    const next = applyMove(board, "TKT-1", 2, 1);
    expect(keys(next, 1)).toEqual(["TKT-2@0", "TKT-4@1"]);
    expect(keys(next, 2)).toEqual(["TKT-5@0", "TKT-1@1", "TKT-6@2"]);
    expect(findTicket(next, "TKT-1")?.ticket.column_id).toBe(2);
  });

  it("moves within a column to the top and to the end", () => {
    const { board } = sampleBoard();
    expect(keys(applyMove(board, "TKT-4", 1, 0), 1)).toEqual(["TKT-4@0", "TKT-1@1", "TKT-2@2"]);
    expect(keys(applyMove(board, "TKT-1", 1, 2), 1)).toEqual(["TKT-2@0", "TKT-4@1", "TKT-1@2"]);
  });

  it("drops into an empty column", () => {
    const { board } = sampleBoard();
    expect(keys(applyMove(board, "TKT-1", 4, 0), 4)).toEqual(["TKT-1@0"]);
  });

  it("does not mutate the input", () => {
    const { board } = sampleBoard();
    const snapshot = structuredClone(board);
    applyMove(board, "TKT-1", 2, 0);
    expect(board).toEqual(snapshot);
  });
});

describe("movePayload", () => {
  const { board } = sampleBoard();

  it("is null when column and index are unchanged", () => {
    expect(movePayload(board, "TKT-2", 1, 1)).toBeNull();
  });

  it("uses position 0..n for a cross-column move", () => {
    expect(movePayload(board, "TKT-1", 2, 0)).toEqual({ column_id: 2, position: 0 });
    expect(movePayload(board, "TKT-1", 2, 2)).toEqual({ column_id: 2, position: 2 });
  });

  it("uses position 0..n-1 for a same-column move", () => {
    expect(movePayload(board, "TKT-1", 1, 2)).toEqual({ column_id: 1, position: 2 });
    expect(movePayload(board, "TKT-4", 1, 0)).toEqual({ column_id: 1, position: 0 });
  });

  it("yields the last position when dropped at the very end of another column", () => {
    expect(movePayload(board, "TKT-1", 3, 2)).toEqual({ column_id: 3, position: 2 });
  });
});
