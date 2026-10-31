import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { columnOrder } from "../../model/board";
import { sampleBoard } from "../../test/msw/fixtures";
import { ColumnsPager } from "./ColumnsPager";

const columns = columnOrder(sampleBoard().board);

describe("ColumnsPager", () => {
  it("shows 1 / 4 and four dots labelled with the column names", () => {
    render(<ColumnsPager columns={columns} visibleIndex={0} />);
    expect(screen.getByText("1 / 4")).toBeVisible();
    for (const name of ["To Do", "In Progress", "Review", "Done"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "To Do" })).toHaveAttribute("aria-current", "true");
  });

  it("marks the third dot current for visibleIndex 2", () => {
    render(<ColumnsPager columns={columns} visibleIndex={2} />);
    expect(screen.getByText("3 / 4")).toBeVisible();
    expect(screen.getByRole("button", { name: "Review" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "To Do" })).not.toHaveAttribute("aria-current");
  });
});
