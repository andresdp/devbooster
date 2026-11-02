import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field";

describe("Field", () => {
  it("links the label to the control", () => {
    render(<Field label="Title">{(props) => <input {...props} />}</Field>);
    expect(screen.getByLabelText("Title")).toBeInstanceOf(HTMLInputElement);
  });

  it("marks required fields visually and with aria-required", () => {
    render(
      <Field label="Title" required>
        {(props) => <input {...props} />}
      </Field>,
    );
    expect(screen.getByLabelText(/Title/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders the error, links it with aria-describedby and sets aria-invalid", () => {
    render(
      <Field label="Title" error="Title is required">
        {(props) => <input {...props} />}
      </Field>,
    );
    const input = screen.getByLabelText("Title");
    const error = screen.getByText("Title is required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(error.closest("p")?.id);
  });

  it("is not invalid without an error", () => {
    render(<Field label="Title">{(props) => <input {...props} />}</Field>);
    expect(screen.getByLabelText("Title")).not.toHaveAttribute("aria-invalid");
  });

  it("renders the hint and describes the control with it", () => {
    render(
      <Field label="Name" hint="Up to 100 characters">
        {(props) => <input {...props} />}
      </Field>,
    );
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Up to 100 characters");
  });
});
