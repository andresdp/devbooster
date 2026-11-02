import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { columnOrder } from "../../model/board";
import { sampleBoard } from "../../test/msw/fixtures";
import { renderWithRouter } from "../../test/render";
import { Column } from "./Column";

const columns = columnOrder(sampleBoard().board);

describe("Column", () => {
  it("renders an h2 with the name and a count chip", () => {
    renderWithRouter(<Column column={columns[0]!} isFirst />);
    const heading = screen.getByRole("heading", { level: 2, name: /To Do/ });
    expect(within(heading).getByText("3")).toBeVisible();
  });

  it("renders cards in tickets array order", () => {
    renderWithRouter(<Column column={columns[0]!} isFirst />);
    const names = screen.getAllByRole("link").map((l) => l.getAttribute("aria-label"));
    expect(names).toEqual([
      "TKT-1 Set up the repository",
      "TKT-2 Fix login redirect",
      "TKT-4 Add board filters",
    ]);
  });

  it("shows an empty state when there are no tickets", () => {
    renderWithRouter(<Column column={columns[3]!} isFirst={false} />);
    expect(screen.getByText("No tickets in Done")).toBeVisible();
  });

  it("renders + New ticket only in the first column", () => {
    const { unmount } = renderWithRouter(<Column column={columns[0]!} isFirst />);
    expect(screen.getByRole("button", { name: "+ New ticket" })).toBeInTheDocument();
    unmount();
    renderWithRouter(<Column column={columns[1]!} isFirst={false} />);
    expect(screen.queryByRole("button", { name: "+ New ticket" })).not.toBeInTheDocument();
  });
});
