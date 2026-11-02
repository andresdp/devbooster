import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("is hidden from assistive tech by default", () => {
    const { container } = render(<Icon name="plus" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("is labelled when given a title", () => {
    const { getByRole } = render(<Icon name="error" title="Error" />);
    const svg = getByRole("img", { name: "Error" });
    expect(svg).not.toHaveAttribute("aria-hidden");
  });
});
