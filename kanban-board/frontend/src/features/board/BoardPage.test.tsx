import { readFileSync } from "node:fs";
import { act, screen, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { useNavigate } from "react-router";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { BoardPage } from "./BoardPage";

const API = "http://localhost:8000/api/v1";
const renderBoard = (route: string) =>
  renderWithRouter(<BoardPage />, { route, path: "/boards/:boardId" });

describe("BoardPage", () => {
  it("renders a header and four column skeletons while loading", () => {
    renderBoard("/boards/1");
    expect(screen.getAllByRole("status")).toHaveLength(4);
  });

  it("renders the board name, columns in order and tickets under their column", async () => {
    renderBoard("/boards/1");
    expect(await screen.findByRole("heading", { name: "Sample Project" })).toBeVisible();
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent?.replace(/\d+$/, ""))).toEqual([
      "To Do",
      "In Progress",
      "Review",
      "Done",
    ]);
    const review = headings[2]!.closest("section")!;
    expect(within(review).getByRole("link", { name: /TKT-3/ })).toBeVisible();
    expect(within(review).getByRole("link", { name: /TKT-7/ })).toBeVisible();
    expect(within(review).queryByRole("link", { name: /TKT-1 /i })).not.toBeInTheDocument();
    expect(screen.getByText("No tickets in Done")).toBeVisible();
  });

  it("shows Board not found for an unknown board", async () => {
    renderBoard("/boards/9999");
    expect(await screen.findByRole("heading", { name: "Board not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to boards" })).toHaveAttribute("href", "/");
  });

  it("shows not found without a request for a non-numeric id", () => {
    const seen = vi.fn();
    server.events.on("request:start", seen);
    renderBoard("/boards/abc");
    expect(screen.getByRole("heading", { name: "Board not found" })).toBeVisible();
    expect(seen).not.toHaveBeenCalled();
    server.events.removeAllListeners();
  });

  it("shows an error state with Retry on a 500", async () => {
    server.use(
      http.get(
        `${API}/boards/1`,
        () =>
          HttpResponse.json(
            { error: { code: "http_error", message: "Boom", details: null } },
            { status: 500 },
          ),
        { once: true },
      ),
    );
    const { user } = renderBoard("/boards/1");
    expect(await screen.findByText("Boom")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Sample Project" })).toBeVisible();
  });

  it("loads the same board when the address is opened directly", async () => {
    renderBoard("/boards/1");
    expect(await screen.findByRole("link", { name: /TKT-5/ })).toBeVisible();
  });

  it("does not show the previous board under a new address while it loads", async () => {
    server.use(
      http.get(`${API}/boards/2`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          id: 2,
          name: "Other Board",
          created_at: "2026-01-01T00:00:00Z",
          columns: [],
        });
      }),
    );
    let go: (to: string) => void = () => {};
    function Nav() {
      const navigate = useNavigate();
      go = (to) => void navigate(to);
      return null;
    }
    renderWithRouter(
      <>
        <Nav />
        <BoardPage />
      </>,
      { route: "/boards/1", path: "/boards/:boardId" },
    );
    expect(await screen.findByRole("heading", { name: "Sample Project" })).toBeVisible();
    act(() => go("/boards/2"));
    expect(screen.queryByRole("heading", { name: "Sample Project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /TKT-1 / })).not.toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(4);
    expect(await screen.findByRole("heading", { name: "Other Board" })).toBeVisible();
  });

  it("bounds the board height so each column body scrolls on its own", async () => {
    renderBoard("/boards/1");
    await screen.findByRole("heading", { name: "Sample Project" });
    const body = screen
      .getAllByRole("heading", { level: 2 })[0]!
      .closest("section")!.lastElementChild!;
    expect(body.className).toContain("body");
    const column = readFileSync("src/features/board/Column.module.css", "utf8");
    const page = readFileSync("src/features/board/BoardPage.module.css", "utf8");
    expect(column).toMatch(/\.body\s*{[^}]*overflow-y:\s*auto/);
    expect(column).toMatch(/\.column\s*{[^}]*max-height:\s*100%/);
    expect(page).toMatch(/\.page\s*{[^}]*height:\s*calc\(100dvh - var\(--header-height\)\)/);
    expect(page).toMatch(/\.columns\s*{[^}]*min-height:\s*0/);
  });

  it("creates a ticket from + New ticket and shows it last in To Do", async () => {
    const { user } = renderBoard("/boards/1");
    await screen.findByRole("heading", { name: "Sample Project" });
    await user.click(screen.getByRole("button", { name: "+ New ticket" }));
    await user.type(screen.getByLabelText(/Title/), "Brand new ticket");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));
    const todo = screen.getByRole("heading", { level: 2, name: /To Do/ }).closest("section")!;
    await within(todo).findByRole("link", { name: /Brand new ticket/ });
    const links = within(todo).getAllByRole("link");
    expect(links[links.length - 1]).toHaveAccessibleName(/Brand new ticket/);
  });
});
