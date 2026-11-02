import { screen, waitFor, within } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import App from "../../App";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";

const API = "http://localhost:8000/api/v1";

async function openEdit() {
  const utils = renderWithRouter(<App />, { route: "/boards/1/tickets/TKT-3" });
  await screen.findByRole("dialog", { name: /TKT-3/ });
  await utils.user.click(screen.getByRole("button", { name: "Edit" }));
  return utils;
}

function capturePatch() {
  const bodies: unknown[] = [];
  server.events.on("request:start", async ({ request }) => {
    if (request.method === "PATCH") bodies.push(await request.clone().json());
  });
  return bodies;
}

describe("TicketEditForm", () => {
  it("switches to a pre-filled form", async () => {
    await openEdit();
    expect(screen.getByLabelText(/Title/)).toHaveValue("Card overflows on narrow screens");
    expect(screen.getByLabelText(/Title/)).toHaveFocus();
    expect(screen.getByLabelText("Assignee")).toHaveValue("Grace Hopper");
    expect(screen.getByRole("radio", { name: "Bug" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "High" })).toBeChecked();
  });

  it("sends one PATCH with only changed fields and updates view and card", async () => {
    const bodies = capturePatch();
    const { user } = await openEdit();
    const title = screen.getByLabelText(/Title/);
    await user.clear(title);
    await user.type(title, "Renamed");
    await user.click(screen.getByRole("radio", { name: "Critical" }));
    await user.clear(screen.getByLabelText("Assignee"));
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog", { name: /Renamed/ });
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus());
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ title: "Renamed", priority: "critical", assignee: null });
    expect(within(dialog).getByText("Unassigned")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /TKT-3 Renamed/ })).toBeInTheDocument(),
    );
  });

  it("sends no request when nothing changed and returns to view mode", async () => {
    const bodies = capturePatch();
    const { user } = await openEdit();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();
    expect(bodies).toHaveLength(0);
  });

  it("discards changes on Cancel", async () => {
    const { user } = await openEdit();
    await user.type(screen.getByLabelText(/Title/), " extra");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("heading", { name: /Card overflows on narrow screens$/ }),
    ).toBeVisible();
  });

  it("shows Required beside an empty title and sends nothing", async () => {
    const seen = vi.fn();
    server.events.on("request:start", ({ request }) => {
      if (request.method === "PATCH") seen();
    });
    const { user } = await openEdit();
    await user.clear(screen.getByLabelText(/Title/));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText(/Title/)).toHaveAccessibleDescription("Required");
    expect(seen).not.toHaveBeenCalled();
  });

  it("places a 422 on title beside it and keeps previous values after Cancel", async () => {
    server.use(
      http.patch(`${API}/tickets/TKT-3`, () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "bad",
              details: [{ field: "title", message: "title is too long" }],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = await openEdit();
    await user.type(screen.getByLabelText(/Title/), " more");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("title is too long")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("heading", { name: /Card overflows on narrow screens$/ }),
    ).toBeVisible();
  });

  it("shows a form-level error on a 500", async () => {
    server.use(
      http.patch(`${API}/tickets/TKT-3`, () =>
        HttpResponse.json(
          { error: { code: "http_error", message: "Boom", details: null } },
          { status: 500 },
        ),
      ),
    );
    const { user } = await openEdit();
    await user.type(screen.getByLabelText(/Title/), " more");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
  });

  it("is disabled while saving", async () => {
    server.use(
      http.patch(`${API}/tickets/TKT-3`, async () => {
        await delay(100);
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = await openEdit();
    await user.type(screen.getByLabelText(/Title/), " more");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });

  it("closes the drawer on Escape while editing without confirmation", async () => {
    const { user } = await openEdit();
    await user.type(screen.getByLabelText(/Title/), " more");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
