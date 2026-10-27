import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { renderWithRouter } from "./test/render";

describe("App", () => {
  it("renders Page not found with a link to / for an unknown address", () => {
    renderWithRouter(<App />, { route: "/no/such/page" });
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to boards" })).toHaveAttribute("href", "/");
  });

  it("shows the header on every route and opens the New board dialog from it", async () => {
    const { user } = renderWithRouter(<App />, { route: "/no/such/page" });
    await user.click(screen.getByRole("button", { name: "New board" }));
    expect(screen.getByRole("dialog", { name: "New board" })).toBeInTheDocument();
  });
});
