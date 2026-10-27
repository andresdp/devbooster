import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("is busy with a default label", () => {
    render(<Skeleton />);
    const el = screen.getByLabelText("Loading");
    expect(el).toHaveAttribute("aria-busy", "true");
  });

  it("accepts a custom label", () => {
    render(<Skeleton label="Loading boards" />);
    expect(screen.getByLabelText("Loading boards")).toBeInTheDocument();
  });

  it("renders the requested number of lines", () => {
    const { container } = render(<Skeleton lines={4} />);
    expect(container.querySelectorAll(".bar")).toHaveLength(4);
  });

  it("supports the card variant", () => {
    render(<Skeleton variant="card" />);
    expect(screen.getByLabelText("Loading")).toHaveClass("card");
  });
});
