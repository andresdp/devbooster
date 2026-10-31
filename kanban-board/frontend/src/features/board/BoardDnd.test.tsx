import { act, screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { FakeResizeObserver, installLayout } from "../../test/layout";
import { server } from "../../test/setup";
import { BoardPage } from "./BoardPage";

const API = "http://localhost:8000/api/v1";

let restore: () => void;
beforeEach(() => {
  restore = installLayout();
  globalThis.ResizeObserver = FakeResizeObserver;
});
afterEach(() => {
  restore();
  server.events.removeAllListeners();
  vi.useRealTimers();
});

const renderBoard = () =>
  renderWithRouter(<BoardPage />, { route: "/boards/1", path: "/boards/:boardId" });
const column = (name: RegExp) =>
  screen.getByRole("heading", { level: 2, name }).closest("section")!;
const card = (key: string) => screen.getByRole("link", { name: new RegExp(key) });

async function moveRight(user: ReturnType<typeof renderBoard>["user"], key: string) {
  card(key).focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowRight}");
  await user.keyboard(" ");
}

function recordMoves() {
  const moves: { url: string; body: unknown }[] = [];
  server.events.on("request:start", async ({ request }) => {
    if (request.method === "POST" && request.url.endsWith("/move")) {
      moves.push({ url: new URL(request.url).pathname, body: await request.clone().json() });
    }
  });
  return moves;
}

function boardFetches() {
  const seen = vi.fn();
  server.events.on("request:start", ({ request }) => {
    if (request.method === "GET" && new URL(request.url).pathname === "/api/v1/boards/1") seen();
  });
  return seen;
}

const failMove = (status: number, code: string, message: string) =>
  http.post(`${API}/tickets/:key/move`, () =>
    HttpResponse.json({ error: { code, message, details: null } }, { status }),
  );

describe("BoardDnd", () => {
  it("moves a card to the next column optimistically and refetches after success", async () => {
    const moves = recordMoves();
    const fetches = boardFetches();
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    await moveRight(user, "TKT-1");
    expect(within(column(/In Progress/)).getByRole("link", { name: /TKT-1/ })).toBeVisible();
    await waitFor(() => expect(moves).toHaveLength(1));
    expect(moves[0]!.url).toBe("/api/v1/tickets/TKT-1/move");
    expect(moves[0]!.body).toMatchObject({ column_id: 2 });
    expect(typeof (moves[0]!.body as { position: unknown }).position).toBe("number");
    await waitFor(() => expect(fetches).toHaveBeenCalledTimes(2));
  });

  it("sends nothing when a card is picked up and dropped in place", async () => {
    const moves = recordMoves();
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    card("TKT-1").focus();
    await user.keyboard(" ");
    await user.keyboard(" ");
    expect(moves).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rolls back and shows a notice on a server error, without refetching", async () => {
    server.use(failMove(500, "http_error", "Server exploded"));
    const fetches = boardFetches();
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    await moveRight(user, "TKT-1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Server exploded");
    const todo = within(column(/To Do/)).getAllByRole("link");
    expect(todo[0]).toHaveAccessibleName(/TKT-1/);
    expect(fetches).toHaveBeenCalledTimes(1);
  });

  it("rolls back, shows a notice and refetches on invalid_move", async () => {
    server.use(failMove(422, "invalid_move", "Stale move"));
    const fetches = boardFetches();
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    await moveRight(user, "TKT-1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Stale move");
    await waitFor(() => expect(fetches).toHaveBeenCalledTimes(2));
  });

  it("closes the notice with its button and clears it after the next successful move", async () => {
    server.use(failMove(500, "http_error", "Server exploded"));
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    await moveRight(user, "TKT-1");
    await user.click(await screen.findByRole("button", { name: "Close" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await moveRight(user, "TKT-1");
    await screen.findByRole("alert");
    server.resetHandlers();
    await moveRight(user, "TKT-1");
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("restores the snapshot when the drag is cancelled with Escape", async () => {
    const moves = recordMoves();
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    card("TKT-1").focus();
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");
    expect(within(column(/To Do/)).getByRole("link", { name: /TKT-1/ })).toBeVisible();
    expect(moves).toHaveLength(0);
  });

  it("shows the saving modifier only after 300 ms and ignores a second drag while committing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let count = 0;
    server.use(
      http.post(`${API}/tickets/:key/move`, async () => {
        count += 1;
        await delay(500);
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    await moveRight(user, "TKT-1");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.queryByText("Saving move…")).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByText("Saving move…")).toBeInTheDocument();
    await moveRight(user, "TKT-2");
    expect(count).toBe(1);
  });

  it("never shows the saving modifier for a fast response", async () => {
    const { user } = renderBoard();
    await screen.findByRole("heading", { name: "Sample Project" });
    await moveRight(user, "TKT-1");
    expect(screen.queryByText("Saving move…")).not.toBeInTheDocument();
  });
});
