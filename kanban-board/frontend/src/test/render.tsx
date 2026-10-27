import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

export function renderWithRouter(
  ui: ReactElement,
  { route = "/", path }: { route?: string; path?: string } = {},
) {
  const user = userEvent.setup();
  const tree = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  );
  const result = render(<MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>);
  return { ...result, user };
}
