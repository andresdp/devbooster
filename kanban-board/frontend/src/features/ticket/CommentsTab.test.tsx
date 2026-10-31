import { screen, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { formatDateTime } from "../../model/format";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { CommentsTab } from "./CommentsTab";

const API = "http://localhost:8000/api/v1";

function setup(ticketKey = "TKT-3") {
  const onChange = vi.fn();
  const utils = renderWithRouter(<CommentsTab ticketKey={ticketKey} onCountChange={onChange} />);
  return { ...utils, onChange };
}

const fail = (path: string, status = 500) =>
  http.get(`${API}${path}`, () =>
    HttpResponse.json(
      { error: { code: "http_error", message: "Boom", details: null } },
      { status },
    ),
  );

describe("CommentsTab", () => {
  it("shows a skeleton then the comments oldest first", async () => {
    setup();
    expect(screen.getByRole("status", { name: /Loading/ })).toBeVisible();
    expect(await screen.findByText("Reproduced on a 320px viewport.")).toBeVisible();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Grace Hopper");
    expect(items[0]).toHaveTextContent("GH");
    expect(items[0]).toHaveTextContent(formatDateTime("2026-10-20T11:00:00Z"));
    expect(items[1]).toHaveTextContent("Ada Lovelace");
  });

  it("reports the count from the loaded list", async () => {
    const { onChange } = setup();
    await screen.findByText("Fix is in review.");
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("shows No comments yet and still renders the form", async () => {
    setup("TKT-1");
    expect(await screen.findByText("No comments yet")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add comment" })).toBeVisible();
  });

  it("requires author and text without sending a request", async () => {
    const seen = vi.fn();
    server.events.on("request:start", ({ request }) => {
      if (request.method === "POST") seen();
    });
    const { user } = setup("TKT-1");
    await screen.findByText("No comments yet");
    await user.type(screen.getByLabelText(/Text/), "kept");
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(screen.getByLabelText(/Author/)).toHaveAccessibleDescription("Required");
    expect(screen.getByLabelText(/Text/)).toHaveValue("kept");
    await user.type(screen.getByLabelText(/Author/), "Ada");
    await user.clear(screen.getByLabelText(/Text/));
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(screen.getByLabelText(/Text/)).toHaveAccessibleDescription("Required");
    expect(seen).not.toHaveBeenCalled();
  });

  it("posts a valid comment, appends it, clears the form and keeps focus in author", async () => {
    const bodies: unknown[] = [];
    server.events.on("request:start", async ({ request }) => {
      if (request.method === "POST") bodies.push(await request.clone().json());
    });
    const { user } = setup();
    await screen.findByText("Fix is in review.");
    await user.type(screen.getByLabelText(/Author/), "Linus");
    await user.type(screen.getByLabelText(/Text/), "Looks good");
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(await screen.findByText("Looks good")).toBeVisible();
    const items = screen.getAllByRole("listitem");
    expect(items[items.length - 1]).toHaveTextContent("Looks good");
    expect(bodies).toEqual([{ author: "Linus", text: "Looks good" }]);
    expect(screen.getByLabelText(/Author/)).toHaveValue("");
    expect(screen.getByLabelText(/Text/)).toHaveValue("");
    await waitFor(() => expect(screen.getByLabelText(/Author/)).toHaveFocus());
  });

  it("is disabled while pending and sends one request", async () => {
    let count = 0;
    server.use(
      http.post(`${API}/tickets/TKT-3/comments`, async () => {
        count += 1;
        await delay(100);
        return HttpResponse.json(
          {
            id: 50,
            ticket_key: "TKT-3",
            author: "A",
            text: "T",
            created_at: "2026-10-20T13:00:00Z",
          },
          { status: 201 },
        );
      }),
    );
    const { user } = setup();
    await screen.findByText("Fix is in review.");
    await user.type(screen.getByLabelText(/Author/), "A");
    await user.type(screen.getByLabelText(/Text/), "T");
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    const pending = screen.getByRole("button", { name: "Adding…" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Adding…" })).toBeNull());
    expect(count).toBe(1);
  });

  it("places a 422 on text beside it and keeps the values", async () => {
    server.use(
      http.post(`${API}/tickets/TKT-3/comments`, () =>
        HttpResponse.json(
          {
            error: {
              code: "validation_error",
              message: "bad",
              details: [{ field: "text", message: "text is too long" }],
            },
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = setup();
    await screen.findByText("Fix is in review.");
    await user.type(screen.getByLabelText(/Author/), "A");
    await user.type(screen.getByLabelText(/Text/), "T");
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(await screen.findByText("text is too long")).toBeVisible();
    expect(screen.getByLabelText(/Author/)).toHaveValue("A");
    expect(screen.getByLabelText(/Text/)).toHaveValue("T");
  });

  it("shows a form-level error on a 500", async () => {
    server.use(
      http.post(`${API}/tickets/TKT-3/comments`, () =>
        HttpResponse.json(
          { error: { code: "http_error", message: "Boom", details: null } },
          { status: 500 },
        ),
      ),
    );
    const { user } = setup();
    await screen.findByText("Fix is in review.");
    await user.type(screen.getByLabelText(/Author/), "A");
    await user.type(screen.getByLabelText(/Text/), "T");
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
  });

  it("shows an inline error with Retry when the list fails", async () => {
    server.use(fail("/tickets/TKT-3/comments"));
    const { user } = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Boom");
    server.resetHandlers();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Fix is in review.")).toBeVisible();
  });
});
