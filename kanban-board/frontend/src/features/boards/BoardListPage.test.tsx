import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { formatDateTime } from "../../model/format";
import { server } from "../../test/setup";
import { renderWithRouter } from "../../test/render";
import { BoardListPage } from "./BoardListPage";

const API = "http://localhost:8000/api/v1";

describe("BoardListPage", () => {
  it("shows a skeleton while loading", () => {
    renderWithRouter(<BoardListPage onNewBoard={() => {}} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("lists each board as a link with its creation date", async () => {
    renderWithRouter(<BoardListPage onNewBoard={() => {}} />);
    const link = await screen.findByRole("link", { name: "Sample Project" });
    expect(link).toHaveAttribute("href", "/boards/1");
    expect(screen.getByRole("heading", { name: "Boards" })).toBeInTheDocument();
    expect(screen.getByText(`Created ${formatDateTime("2026-10-20T10:00:00Z")}`)).toBeVisible();
  });

  it("shows an empty state with a New board button when there are no boards", async () => {
    server.use(http.get(`${API}/boards`, () => HttpResponse.json([])));
    const onNewBoard = vi.fn();
    const { user } = renderWithRouter(<BoardListPage onNewBoard={onNewBoard} />);
    expect(await screen.findByText("No boards yet")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "New board" }));
    expect(onNewBoard).toHaveBeenCalledOnce();
  });

  it("shows the server message on a 500 and recovers on Retry", async () => {
    server.use(
      http.get(
        `${API}/boards`,
        () =>
          HttpResponse.json(
            { error: { code: "http_error", message: "Database is down", details: null } },
            { status: 500 },
          ),
        { once: true },
      ),
    );
    const { user } = renderWithRouter(<BoardListPage onNewBoard={() => {}} />);
    expect(await screen.findByText("Database is down")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: "Sample Project" })).toBeVisible();
  });

  it("shows a network message when the server is unreachable", async () => {
    server.use(http.get(`${API}/boards`, () => HttpResponse.error()));
    renderWithRouter(<BoardListPage onNewBoard={() => {}} />);
    expect(await screen.findByText("Could not reach the server.")).toBeVisible();
  });
});
