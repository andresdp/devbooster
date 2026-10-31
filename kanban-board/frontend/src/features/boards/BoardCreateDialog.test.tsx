import { screen, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { BoardCreateDialog } from "./BoardCreateDialog";

const API = "http://localhost:8000/api/v1";

function Location() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function setup(onClose = vi.fn()) {
  const utils = renderWithRouter(
    <>
      <BoardCreateDialog onClose={onClose} />
      <Routes>
        <Route path="*" element={<Location />} />
      </Routes>
    </>,
  );
  return { ...utils, onClose };
}

const requests = () => {
  const seen = vi.fn();
  server.events.on("request:start", seen);
  return seen;
};

describe("BoardCreateDialog", () => {
  it("opens with focus in the name field", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Create new board" })).toBeVisible();
    expect(screen.getByLabelText(/Name/)).toHaveFocus();
  });

  it("shows Required beside the field and sends no request for a blank name", async () => {
    const seen = requests();
    const { user } = setup();
    await user.type(screen.getByLabelText(/Name/), "   ");
    await user.click(screen.getByRole("button", { name: "Create board" }));
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Required");
    expect(seen).not.toHaveBeenCalled();
  });

  it("places the 409 conflict message beside the name field", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/Name/), "sample project");
    await user.click(screen.getByRole("button", { name: "Create board" }));
    expect(await screen.findByText("A board with this name already exists")).toBeVisible();
    expect(screen.getByLabelText(/Name/)).toHaveAttribute("aria-invalid", "true");
  });

  it("places a 422 on name beside the field", async () => {
    server.use(
      http.post(`${API}/boards`, () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "bad",
              details: [{ field: "name", message: "name is too long" }],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/Name/), "x");
    await user.click(screen.getByRole("button", { name: "Create board" }));
    expect(await screen.findByText("name is too long")).toBeVisible();
  });

  it("shows a form-level error for unknown fields and server errors", async () => {
    server.use(
      http.post(`${API}/boards`, () =>
        HttpResponse.json(
          { error: { code: "http_error", message: "Boom", details: null } },
          { status: 500 },
        ),
      ),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/Name/), "x");
    await user.click(screen.getByRole("button", { name: "Create board" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
  });

  it("disables the button while pending and sends one request", async () => {
    let count = 0;
    server.use(
      http.post(`${API}/boards`, async () => {
        count += 1;
        await delay(100);
        return HttpResponse.json(
          { id: 9, name: "X", created_at: "2026-10-20T10:00:00Z", columns: [] },
          { status: 201 },
        );
      }),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/Name/), "X");
    const button = screen.getByRole("button", { name: "Create board" });
    await user.click(button);
    const pending = screen.getByRole("button", { name: "Creating…" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/boards/9"));
    expect(count).toBe(1);
  });

  it("closes and navigates to the new board on success", async () => {
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText(/Name/), "Brand new");
    await user.click(screen.getByRole("button", { name: "Create board" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toMatch(/^\/boards\/\d+$/),
    );
  });

  it("closes on Cancel", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("clears the field error when typing", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Create board" }));
    expect(screen.getByText("Required")).toBeVisible();
    await user.type(screen.getByLabelText(/Name/), "a");
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });
});
