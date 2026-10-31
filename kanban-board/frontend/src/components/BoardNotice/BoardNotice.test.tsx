import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BoardNotice } from "./BoardNotice";

describe("BoardNotice", () => {
  it("renders nothing for null", () => {
    const { container } = render(<BoardNotice message={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an alert with the message and a Close button", async () => {
    const onClose = vi.fn();
    render(<BoardNotice message="Could not move" onClose={onClose} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not move");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
