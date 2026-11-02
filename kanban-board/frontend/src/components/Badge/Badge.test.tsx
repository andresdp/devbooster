import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders a type badge", () => {
    render(<Badge variant="type" value="bug" />);
    const badge = screen.getByText("Bug");
    expect(badge).toHaveClass("type-bug");
  });

  it("renders a priority badge", () => {
    render(<Badge variant="priority" value="critical" />);
    expect(screen.getByText("Critical")).toHaveClass("priority-critical");
  });
});
