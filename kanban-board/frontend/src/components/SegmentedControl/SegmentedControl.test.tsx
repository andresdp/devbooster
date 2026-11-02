import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
];

function Harness() {
  const [value, setValue] = useState("bug");
  return <SegmentedControl label="Type" options={options} value={value} onChange={setValue} />;
}

describe("SegmentedControl", () => {
  it("renders a labelled radiogroup with one radio per option", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Type" })).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Bug" })).toBeChecked();
  });

  it("changes value on click", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "Task" }));
    expect(screen.getByRole("radio", { name: "Task" })).toBeChecked();
  });

  it("changes value with arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    screen.getByRole("radio", { name: "Bug" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Feature" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Feature" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Bug" })).toBeChecked();
  });
});
