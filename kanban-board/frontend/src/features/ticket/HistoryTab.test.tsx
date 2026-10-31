import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { formatDateTime } from "../../model/format";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { HistoryTab } from "./HistoryTab";

const API = "http://localhost:8000/api/v1";

function setup(ticketKey = "TKT-3", refreshKey = 0) {
  const onCountChange = vi.fn();
  const utils = renderWithRouter(
    <HistoryTab ticketKey={ticketKey} refreshKey={refreshKey} onCountChange={onCountChange} />,
  );
  return { ...utils, onCountChange };
}

describe("HistoryTab", () => {
  it("shows a skeleton then three entries oldest first", async () => {
    const { onCountChange } = setup();
    expect(screen.getByRole("status", { name: /Loading/ })).toBeVisible();
    expect(await screen.findByText("Created in To Do")).toBeVisible();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Created in To Do");
    expect(items[1]).toHaveTextContent("To Do → In Progress");
    expect(items[2]).toHaveTextContent("In Progress → Review");
    expect(items[1]).toHaveTextContent(formatDateTime("2026-10-20T10:30:00Z"));
    expect(items[1]!.querySelector("time")).toHaveAttribute("datetime", "2026-10-20T10:30:00Z");
    expect(onCountChange).toHaveBeenLastCalledWith(3);
  });

  it("shows an empty state when there is no history", async () => {
    setup("TKT-1");
    expect(await screen.findByText("No history yet")).toBeVisible();
  });

  it("shows an inline error with Retry", async () => {
    server.use(
      http.get(`${API}/tickets/TKT-3/history`, () =>
        HttpResponse.json(
          { error: { code: "http_error", message: "Boom", details: null } },
          { status: 500 },
        ),
      ),
    );
    const { user } = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Created in To Do")).toBeVisible();
  });
});
