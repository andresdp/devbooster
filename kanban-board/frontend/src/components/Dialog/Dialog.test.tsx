import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("is a modal dialog labelled by its heading", () => {
    render(
      <Dialog title="New board" onClose={() => {}}>
        <input aria-label="Name" />
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "New board" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus to the first focusable field on open", () => {
    render(
      <Dialog title="New board" onClose={() => {}}>
        <input aria-label="Name" />
      </Dialog>,
    );
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("honours initialFocusRef", () => {
    function Host() {
      const ref = useRef<HTMLInputElement>(null);
      return (
        <Dialog title="T" onClose={() => {}} initialFocusRef={ref}>
          <input aria-label="First" />
          <input aria-label="Second" ref={ref} />
        </Dialog>
      );
    }
    render(<Host />);
    expect(screen.getByLabelText("Second")).toHaveFocus();
  });

  it("wraps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Outside</button>
        <Dialog title="T" onClose={() => {}}>
          <input aria-label="Name" />
          <button>Create</button>
        </Dialog>
      </>,
    );
    // Order inside: Close icon button, Name, Create.
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Create" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Create" })).toHaveFocus();
  });

  it("calls onClose on Escape, backdrop click and the Close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog title="T" onClose={onClose}>
        <input aria-label="Name" />
      </Dialog>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("dialog-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("does not close when clicking inside the dialog", async () => {
    const onClose = vi.fn();
    render(
      <Dialog title="T" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    );
    await userEvent.setup().click(screen.getByText("Body"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("returns focus to the previously focused element on close", async () => {
    const user = userEvent.setup();
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <Dialog title="T" onClose={() => setOpen(false)}>
              <input aria-label="Name" />
            </Dialog>
          )}
        </>
      );
    }
    render(<Host />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByLabelText("Name")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });
});
