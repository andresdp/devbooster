import { useState } from "react";
import { Route, Routes } from "react-router";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { NotFoundState } from "./components/NotFoundState/NotFoundState";
import { BoardPage } from "./features/board/BoardPage";
import { TicketDrawer } from "./features/ticket/TicketDrawer";
import { BoardListPage } from "./features/boards/BoardListPage";
import { BoardCreateDialog } from "./features/boards/BoardCreateDialog";

function NotFoundPage() {
  return (
    <NotFoundState
      title="Page not found"
      description="The page you are looking for does not exist."
      to="/"
      linkLabel="Back to boards"
    />
  );
}

export default function App() {
  const [newBoardOpen, setNewBoardOpen] = useState(false);

  return (
    <>
      <AppHeader onNewBoard={() => setNewBoardOpen(true)} />
      <main>
        <Routes>
          <Route path="/" element={<BoardListPage onNewBoard={() => setNewBoardOpen(true)} />} />
          <Route path="/boards/:boardId" element={<BoardPage />}>
            <Route path="tickets/:key" element={<TicketDrawer />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {newBoardOpen ? <BoardCreateDialog onClose={() => setNewBoardOpen(false)} /> : null}
    </>
  );
}
