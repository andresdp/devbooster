import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "a", label: "Comments (2)", panel: <p>Panel A</p> },
  { id: "b", label: "History (3)", panel: <p>Panel B</p> },
];

describe("Tabs", () => {
  it("renders a tablist with selected state and the active panel", () => {
    render(<Tabs label="Ticket details" tabs={tabs} />);
    expect(screen.getByRole("tablist", { name: "Ticket details" })).toBeVisible();
    const [first, second] = screen.getAllByRole("tab");
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveAttribute("aria-selected", "false");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Panel A");
    expect(first).toHaveAttribute("aria-controls", panel.id);
  });

  it("moves selection and focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<Tabs label="Ticket details" tabs={tabs} />);
    const [first, second] = screen.getAllByRole("tab");
    first!.focus();
    await user.keyboard("{ArrowRight}");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
    await user.keyboard("{ArrowLeft}");
    expect(first).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel A");
  });

  it("switches on click", async () => {
    const user = userEvent.setup();
    render(<Tabs label="Ticket details" tabs={tabs} />);
    await user.click(screen.getByRole("tab", { name: "History (3)" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
  });
});
