import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { formatDateTime } from "../../model/format";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";

function countBoardFetches() {
  const seen = vi.fn();
  server.events.on("request:start", ({ request }) => {
    if (request.method === "GET" && new URL(request.url).pathname === "/api/v1/boards/1") seen();
  });
  return seen;
}

describe("TicketDrawer", () => {
  it("shows every ticket field in a labelled modal dialog", async () => {
    renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-3" });
    const dialog = await screen.findByRole("dialog", { name: /TKT-3/ });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      within(dialog).getByRole("heading", { name: /Card overflows on narrow screens/ }),
    ).toBeVisible();
    expect(
      within(dialog).getByText("Description of Card overflows on narrow screens"),
    ).toBeVisible();
    expect(within(dialog).getByText("Bug")).toBeVisible();
    expect(within(dialog).getByText("High")).toBeVisible();
    expect(within(dialog).getByText("Grace Hopper")).toBeVisible();
    expect(within(dialog).getByText("Review")).toBeVisible();
    expect(dialog).toHaveTextContent(`Created ${formatDateTime("2026-10-20T10:00:00Z")}`);
    expect(dialog).toHaveTextContent(`Updated ${formatDateTime("2026-10-20T10:00:00Z")}`);
  });

  it("shows Unassigned and No description when empty", async () => {
    renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-2" });
    const dialog = await screen.findByRole("dialog", { name: /TKT-2/ });
    expect(within(dialog).getByText("Unassigned")).toBeVisible();
  });

  it("focuses Close on open; Escape closes without refetching the board", async () => {
    const fetches = countBoardFetches();
    const { user } = renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-3" });
    await screen.findByRole("dialog", { name: /TKT-3/ });
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Sample Project" })).toBeVisible();
    expect(fetches).toHaveBeenCalledTimes(1);
  });

  it("closes with the close button", async () => {
    const { user } = renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-3" });
    await screen.findByRole("dialog", { name: /TKT-3/ });
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("opens from a card click and returns focus to that card on close", async () => {
    const { user } = renderWithRouter(<App />, { route: "/boards/1" });
    const card = await screen.findByRole("link", { name: /TKT-3/ });
    await user.click(card);
    await screen.findByRole("dialog", { name: /TKT-3/ });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: /TKT-3/ })).toHaveFocus();
  });

  it.each(["TKT-0", "TKT-99999"])(
    "shows Ticket not found for %s without a ticket request",
    async (key) => {
      const paths: string[] = [];
      server.events.on("request:start", ({ request }) => paths.push(new URL(request.url).pathname));
      renderWithRouter(<App />, { route: `/boards/1/tickets/${key}` });
      expect(await screen.findByRole("heading", { name: "Ticket not found" })).toBeVisible();
      expect(screen.getByRole("link", { name: "Back to board" })).toHaveAttribute(
        "href",
        "/boards/1",
      );
      expect(paths.some((p) => p.startsWith("/api/v1/tickets/"))).toBe(false);
    },
  );

  it("labels the tabs with counts from the loaded lists", async () => {
    renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-3" });
    expect(await screen.findByRole("tab", { name: "Comments (2)" })).toBeVisible();
    expect(await screen.findByRole("tab", { name: "History (3)" })).toBeVisible();
  });
});

describe("TicketDrawer move", () => {
  it("moves the ticket from the drawer and refreshes history", async () => {
    const { user } = renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-3" });
    await screen.findByRole("tab", { name: "History (3)" });
    await user.selectOptions(screen.getByLabelText("Move to"), "Done");
    await user.click(screen.getByRole("button", { name: "Move" }));
    expect(await screen.findByRole("tab", { name: "History (4)" })).toBeVisible();
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(within(dialog).getAllByText("Done").length).toBeGreaterThan(0));
  });
});
