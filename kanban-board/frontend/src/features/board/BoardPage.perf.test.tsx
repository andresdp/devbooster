import { screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLargeBoard } from "../../test/msw/fixtures";
import { FakeResizeObserver, installLayout } from "../../test/layout";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { BoardPage } from "./BoardPage";

const API = "http://localhost:8000/api/v1";
let restore: () => void;

beforeEach(() => {
  restore = installLayout();
  globalThis.ResizeObserver = FakeResizeObserver;
  const { board } = createLargeBoard(200);
  server.use(
    http.get(`${API}/boards/1`, () => HttpResponse.json(board)),
    http.post(`${API}/tickets/:key/move`, () => HttpResponse.json({}, { status: 200 })),
  );
});
afterEach(() => restore());

describe("BoardPage with 200 tickets (EC-006)", () => {
  it("renders every card in To Do within the time budget, in a scrollable column", async () => {
    const start = performance.now();
    renderWithRouter(<BoardPage />, { route: "/boards/1", path: "/boards/:boardId" });
    await screen.findByRole("heading", { name: "Large Project" });
    const todo = screen.getByRole("heading", { level: 2, name: /To Do/ }).closest("section")!;
    expect(within(todo).getAllByRole("link")).toHaveLength(200);
    expect(performance.now() - start).toBeLessThan(2000);
    const body = todo.querySelector("[data-column-body]");
    expect(body).not.toBeNull();
  });

  it("still lets the keyboard pick up and cancel the last card", async () => {
    // jsdom has no layout, so the geometry-dependent arrow navigation is covered by BoardDnd.test.tsx;
    // here we assert that the drag machinery works on the last of 200 cards.
    const { user } = renderWithRouter(<BoardPage />, {
      route: "/boards/1",
      path: "/boards/:boardId",
    });
    await screen.findByRole("heading", { name: "Large Project" });
    screen.getByRole("link", { name: /TKT-200 / }).focus();
    await user.keyboard(" ");
    expect(screen.getAllByText("Drop ticket here").length).toBeGreaterThan(0);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Drop ticket here")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: /TKT-200 / })).toBeVisible();
  });
});
