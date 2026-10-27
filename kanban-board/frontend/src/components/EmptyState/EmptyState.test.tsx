import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No boards yet" description="Create your first board." />);
    expect(screen.getByRole("heading", { name: "No boards yet" })).toBeInTheDocument();
    expect(screen.getByText("Create your first board.")).toBeInTheDocument();
  });

  it("renders the action slot when given", () => {
    render(<EmptyState title="T" action={<button>New board</button>} />);
    expect(screen.getByRole("button", { name: "New board" })).toBeInTheDocument();
  });
});
