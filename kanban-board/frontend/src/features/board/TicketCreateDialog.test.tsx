import { screen, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { TicketCreateDialog } from "./TicketCreateDialog";

const API = "http://localhost:8000/api/v1";

function setup() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const utils = renderWithRouter(
    <TicketCreateDialog boardId={1} onClose={onClose} onCreated={onCreated} />,
  );
  return { ...utils, onClose, onCreated };
}

function captureCreate() {
  const bodies: unknown[] = [];
  server.use(
    http.post(`${API}/boards/1/tickets`, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json(
        {
          key: "TKT-99",
          board_id: 1,
          column_id: 1,
          position: 3,
          title: "t",
          description: "",
          type: "task",
          priority: "medium",
          assignee: null,
          created_at: "2026-10-20T10:00:00Z",
          updated_at: "2026-10-20T10:00:00Z",
        },
        { status: 201 },
      );
    }),
  );
  return bodies;
}

const submit = (user: ReturnType<typeof setup>["user"]) =>
  user.click(screen.getByRole("button", { name: "Create ticket" }));

describe("TicketCreateDialog", () => {
  it("renders the fields with defaults and the info note", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "New ticket" })).toBeVisible();
    expect(screen.getByLabelText(/Title/)).toHaveFocus();
    expect(screen.getByLabelText("Description")).toBeVisible();
    expect(screen.getByLabelText("Type")).toHaveValue("task");
    expect(screen.getByLabelText("Priority")).toHaveValue("medium");
    expect(screen.getByLabelText("Assignee")).toBeVisible();
    expect(screen.getByText("The ticket will be added to the bottom of To Do.")).toBeVisible();
  });

  it("sends only the title for a title-only submit", async () => {
    const bodies = captureCreate();
    const { user, onCreated, onClose } = setup();
    await user.type(screen.getByLabelText(/Title/), "Only title");
    await submit(user);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodies).toEqual([{ title: "Only title" }]);
    expect(onCreated).toHaveBeenCalled();
  });

  it("sends all five fields for a full submit", async () => {
    const bodies = captureCreate();
    const { user } = setup();
    await user.type(screen.getByLabelText(/Title/), "Full");
    await user.type(screen.getByLabelText("Description"), "Details");
    await user.selectOptions(screen.getByLabelText("Type"), "bug");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.type(screen.getByLabelText("Assignee"), "Ada");
    await submit(user);
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      title: "Full",
      description: "Details",
      type: "bug",
      priority: "high",
      assignee: "Ada",
    });
  });

  it("shows Required and sends nothing for an empty title, keeping other values", async () => {
    const seen = vi.fn();
    server.events.on("request:start", seen);
    const { user } = setup();
    await user.type(screen.getByLabelText("Description"), "kept");
    await submit(user);
    expect(screen.getByLabelText(/Title/)).toHaveAccessibleDescription("Required");
    expect(screen.getByLabelText("Description")).toHaveValue("kept");
    expect(seen).not.toHaveBeenCalled();
  });

  it("places 422 messages beside their fields and keeps values", async () => {
    server.use(
      http.post(`${API}/boards/1/tickets`, () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "bad",
              details: [
                { field: "title", message: "title is too long" },
                { field: "assignee", message: "assignee is too long" },
                { field: "description", message: "description is too long" },
              ],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const { user, onCreated } = setup();
    await user.type(screen.getByLabelText(/Title/), "abc");
    await submit(user);
    expect(await screen.findByText("title is too long")).toBeVisible();
    expect(screen.getByText("assignee is too long")).toBeVisible();
    expect(screen.getByText("description is too long")).toBeVisible();
    expect(screen.getByLabelText(/Title/)).toHaveValue("abc");
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows a form-level error for a server failure", async () => {
    server.use(
      http.post(`${API}/boards/1/tickets`, () =>
        HttpResponse.json(
          { error: { code: "http_error", message: "Boom", details: null } },
          { status: 500 },
        ),
      ),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/Title/), "abc");
    await submit(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
  });

  it("is disabled while pending and sends one request", async () => {
    let count = 0;
    server.use(
      http.post(`${API}/boards/1/tickets`, async () => {
        count += 1;
        await delay(100);
        return HttpResponse.json({ key: "TKT-9" }, { status: 201 });
      }),
    );
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText(/Title/), "abc");
    await submit(user);
    const pending = screen.getByRole("button", { name: "Creating…" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(count).toBe(1);
  });

  it("closes on Escape", async () => {
    const { user, onClose } = setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
