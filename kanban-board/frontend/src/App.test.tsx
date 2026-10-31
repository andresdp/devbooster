import { screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import App from "./App";
import { renderWithRouter } from "./test/render";
import { server } from "./test/setup";

describe("App", () => {
  it("renders Page not found with a link to / for an unknown address", () => {
    renderWithRouter(<App />, { route: "/no/such/page" });
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to boards" })).toHaveAttribute("href", "/");
  });

  it("shows the header on every route and opens the New board dialog from it", async () => {
    const { user } = renderWithRouter(<App />, { route: "/no/such/page" });
    await user.click(screen.getByRole("button", { name: "New board" }));
    expect(screen.getByRole("dialog", { name: "Create new board" })).toBeInTheDocument();
  });

  it("opens the board create dialog from the header on / and /boards/1", async () => {
    const first = renderWithRouter(<App />, { route: "/" });
    await first.user.click(screen.getByRole("button", { name: "New board" }));
    expect(screen.getByRole("dialog", { name: "Create new board" })).toBeInTheDocument();
    first.unmount();
    const second = renderWithRouter(<App />, { route: "/boards/1" });
    await second.user.click(screen.getByRole("button", { name: "New board" }));
    expect(screen.getByRole("dialog", { name: "Create new board" })).toBeInTheDocument();
  });

  it("opens the same dialog from the empty-state button on /", async () => {
    server.use(http.get("http://localhost:8000/api/v1/boards", () => HttpResponse.json([])));
    const { user } = renderWithRouter(<App />, { route: "/" });
    await screen.findByText("No boards yet");
    const buttons = screen.getAllByRole("button", { name: "New board" });
    await user.click(buttons[buttons.length - 1]!);
    expect(screen.getByRole("dialog", { name: "Create new board" })).toBeInTheDocument();
  });
});
