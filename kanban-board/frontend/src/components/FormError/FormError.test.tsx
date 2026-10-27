import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormError } from "./FormError";

describe("FormError", () => {
  it("renders nothing for null", () => {
    const { container } = render(<FormError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an alert with the title and message", () => {
    render(<FormError message="Could not reach the server." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("Could not reach the server.");
  });

  it("lists additional messages", () => {
    render(<FormError message="Invalid" messages={["one", "two"]} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["one", "two"]);
  });
});
