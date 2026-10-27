import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "../../test/render";
import { NotFoundState } from "./NotFoundState";

describe("NotFoundState", () => {
  it("renders title, description and a link", () => {
    renderWithRouter(
      <NotFoundState
        title="Board not found"
        description="It may have been removed."
        to="/"
        linkLabel="Back to boards"
      />,
    );
    expect(screen.getByRole("heading", { name: "Board not found" })).toBeInTheDocument();
    expect(screen.getByText("It may have been removed.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to boards" })).toHaveAttribute("href", "/");
  });
});
