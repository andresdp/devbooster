import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Ticket } from "../../api/types";
import { renderWithRouter } from "../../test/render";
import { TicketCard } from "./TicketCard";

const base: Ticket = {
  key: "TKT-9",
  board_id: 3,
  column_id: 1,
  position: 0,
  title: "Fix login redirect",
  description: "",
  type: "bug",
  priority: "high",
  assignee: "Ada Lovelace",
  created_at: "2026-10-20T10:00:00Z",
  updated_at: "2026-10-20T10:00:00Z",
};

describe("TicketCard", () => {
  it("renders key, title, badges and assignee", () => {
    renderWithRouter(<TicketCard ticket={base} />);
    expect(screen.getByText("TKT-9")).toBeVisible();
    expect(screen.getByText("Fix login redirect")).toBeVisible();
    expect(screen.getByText("Bug")).toBeVisible();
    expect(screen.getByText("High")).toBeVisible();
    expect(screen.getByText("Ada Lovelace")).toBeVisible();
  });

  it("shows italic Unassigned when there is no assignee", () => {
    renderWithRouter(<TicketCard ticket={{ ...base, assignee: null }} />);
    expect(screen.getByText("Unassigned")).toHaveClass("unassigned");
  });

  it("is a single link to the ticket address named by key and title", () => {
    renderWithRouter(<TicketCard ticket={base} />);
    const link = screen.getByRole("link", { name: "TKT-9 Fix login redirect" });
    expect(link).toHaveAttribute("href", "/boards/3/tickets/TKT-9");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("clamps the title to two lines", () => {
    renderWithRouter(<TicketCard ticket={base} />);
    expect(screen.getByText("Fix login redirect")).toHaveClass("title");
  });
});
