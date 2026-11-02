import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../../test/render";
import { AppHeader } from "./AppHeader";

describe("AppHeader", () => {
  it("renders the app name linking to the board list", () => {
    renderWithRouter(<AppHeader onNewBoard={() => {}} />);
    expect(screen.getByRole("link", { name: /Kanban/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("calls onNewBoard from the New board button", async () => {
    const onNewBoard = vi.fn();
    const { user } = renderWithRouter(<AppHeader onNewBoard={onNewBoard} />);
    await user.click(screen.getByRole("button", { name: "New board" }));
    expect(onNewBoard).toHaveBeenCalledTimes(1);
  });
});
