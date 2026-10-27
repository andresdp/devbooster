import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("is an alert showing the message", () => {
    render(<ErrorState message="Could not reach the server." onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the server.");
  });

  it("calls onRetry from the Retry button", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="x" onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
