import { useState } from "react";
import { Route, Routes } from "react-router";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { Dialog } from "./components/Dialog/Dialog";
import { NotFoundState } from "./components/NotFoundState/NotFoundState";

// Placeholders: replaced by the real pages in the story phases.
function BoardListPage() {
  return <h1>Boards</h1>;
}

function BoardPage() {
  return <h1>Board</h1>;
}

function TicketDrawer() {
  return <h2>Ticket</h2>;
}

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
          <Route path="/" element={<BoardListPage />} />
          <Route path="/boards/:boardId" element={<BoardPage />}>
            <Route path="tickets/:key" element={<TicketDrawer />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {newBoardOpen ? (
        <Dialog title="New board" onClose={() => setNewBoardOpen(false)}>
          <p>Board creation arrives with the next story.</p>
        </Dialog>
      ) : null}
    </>
  );
}
