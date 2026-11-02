import { screen, waitFor } from "@testing-library/react";
import { delay, HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { server } from "../../test/setup";
import { MoveToColumnSelect } from "./MoveToColumnSelect";
import { sampleBoard } from "../../test/msw/fixtures";

const API = "http://localhost:8000/api/v1";

function setup(disabled = false) {
  const onMoved = vi.fn();
  const columns = sampleBoard().board.columns;
  const utils = renderWithRouter(
    <MoveToColumnSelect
      ticketKey="TKT-3"
      currentColumnId={3}
      columns={columns}
      disabled={disabled}
      onMoved={onMoved}
    />,
  );
  return { ...utils, onMoved };
}

describe("MoveToColumnSelect", () => {
  it("lists the three other columns", () => {
    setup();
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["To Do", "In Progress", "Done"]);
  });

  it("sends column_id only, then announces the move", async () => {
    const bodies: unknown[] = [];
    server.events.on("request:start", async ({ request }) => {
      if (request.method === "POST") bodies.push(await request.clone().json());
    });
    const { user, onMoved } = setup();
    await user.selectOptions(screen.getByLabelText("Move to"), "Done");
    await user.click(screen.getByRole("button", { name: "Move" }));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith("Done"));
    expect(bodies).toEqual([{ column_id: 4 }]);
    expect(await screen.findByText("Moved to Done")).toBeInTheDocument();
  });

  it("is disabled while pending", async () => {
    server.use(
      http.post(`${API}/tickets/TKT-3/move`, async () => {
        await delay(100);
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Move" }));
    expect(screen.getByRole("button", { name: "Moving…" })).toBeDisabled();
  });

  it("shows an invalid_move error inline", async () => {
    server.use(
      http.post(`${API}/tickets/TKT-3/move`, () =>
        HttpResponse.json(
          { error: { code: "invalid_move", message: "Cannot move there", details: null } },
          { status: 422 },
        ),
      ),
    );
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Move" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot move there");
  });

  it("is disabled while a drag move is committing", () => {
    setup(true);
    expect(screen.getByLabelText("Move to")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
  });
});
