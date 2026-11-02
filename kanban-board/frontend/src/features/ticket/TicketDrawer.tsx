import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import type { Ticket } from "../../api/types";
import { Icon } from "../../components/Icon/Icon";
import { Tabs } from "../../components/Tabs/Tabs";
import { findTicket } from "../../model/board";
import { useBoardContext } from "../board/boardContext";
import { CommentsTab } from "./CommentsTab";
import { MoveToColumnSelect } from "./MoveToColumnSelect";
import { HistoryTab } from "./HistoryTab";
import { TicketEditForm } from "./TicketEditForm";
import { TicketView } from "./TicketView";
import styles from "./TicketDrawer.module.css";

const KEY_PATTERN = /^TKT-[1-9][0-9]*$/;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function TicketDrawer() {
  const { key = "" } = useParams();
  const { board } = useBoardContext();
  const found = KEY_PATTERN.test(key) ? findTicket(board, key) : undefined;
  return found ? (
    <LoadedDrawer key={key} ticketKey={key} />
  ) : (
    <DrawerShell
      boardId={board.id}
      ticketKey={key}
      labelledBy="ticket-not-found"
      title={<h2 id="ticket-not-found">Ticket not found</h2>}
    >
      <p>This ticket does not exist on this board.</p>
      <Link to={`/boards/${board.id}`} className={styles.back}>
        Back to board
      </Link>
    </DrawerShell>
  );
}

interface ShellProps {
  boardId: number;
  ticketKey: string;
  labelledBy: string;
  title: React.ReactNode;
  children: React.ReactNode;
}

function DrawerShell({ boardId, ticketKey, labelledBy, title, children }: ShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const direct = useRef(location.key === "default");

  const close = useCallback(() => {
    void navigate(`/boards/${boardId}`, { replace: direct.current });
  }, [navigate, boardId]);
  const closeRef2 = useRef(close);
  useEffect(() => {
    closeRef2.current = close;
  });

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef2.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const card = Array.from(document.querySelectorAll<HTMLElement>("[data-ticket-key]")).find(
        (el) => el.dataset.ticketKey === ticketKey,
      );
      (card ?? document.querySelector<HTMLElement>("[data-board-heading]"))?.focus();
    };
  }, [ticketKey]);

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={styles.drawer}
      >
        <div className={styles.header}>
          {title}
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}

function LoadedDrawer({ ticketKey }: { ticketKey: string }) {
  const { board, reload, clearNotice, moving } = useBoardContext();
  const found = findTicket(board, ticketKey);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [returned, setReturned] = useState(false);
  const [patched, setPatched] = useState<Ticket | undefined>(undefined);
  const [commentCount, setCommentCount] = useState<number | undefined>(undefined);
  const [historyCount, setHistoryCount] = useState<number | undefined>(undefined);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // A move made from the board (drag) changes the ticket's column: refresh its history.
  const columnId = found?.column.id;
  const lastColumn = useRef(columnId);
  useEffect(() => {
    if (lastColumn.current !== columnId) {
      lastColumn.current = columnId;
      setHistoryRefresh((n) => n + 1);
    }
  }, [columnId]);

  if (!found) return null;
  const { column } = found;
  const boardTicket = found.ticket;
  const ticket =
    patched && patched.key === boardTicket.key && patched.updated_at >= boardTicket.updated_at
      ? patched
      : boardTicket;

  const leaveEdit = () => {
    setMode("view");
    setReturned(true);
  };

  const label = (name: string, count: number | undefined) =>
    `${name} (${count === undefined ? "…" : count})`;

  return (
    <DrawerShell
      boardId={board.id}
      ticketKey={ticketKey}
      labelledBy="ticket-drawer-title"
      title={
        <h2 id="ticket-drawer-title" className={styles.heading}>
          <span className={styles.key}>{ticket.key}</span> {ticket.title}
        </h2>
      }
    >
      {mode === "view" ? (
        <TicketView
          ticket={ticket}
          column={column}
          focusEdit={returned}
          onEdit={() => setMode("edit")}
          moveSlot={
            <MoveToColumnSelect
              ticketKey={ticketKey}
              currentColumnId={column.id}
              columns={board.columns}
              disabled={moving}
              onMoved={() => {
                clearNotice();
                setHistoryRefresh((n) => n + 1);
                reload();
              }}
            />
          }
        />
      ) : (
        <TicketEditForm
          ticket={ticket}
          onCancel={leaveEdit}
          onSaved={(updated) => {
            setPatched(updated);
            clearNotice();
            reload();
            leaveEdit();
          }}
        />
      )}
      <Tabs
        label="Ticket details"
        tabs={[
          {
            id: "comments",
            label: label("Comments", commentCount),
            panel: (
              <CommentsTab
                ticketKey={ticketKey}
                onCountChange={setCommentCount}
                onAdded={clearNotice}
              />
            ),
          },
          {
            id: "history",
            label: label("History", historyCount),
            panel: (
              <HistoryTab
                ticketKey={ticketKey}
                refreshKey={historyRefresh}
                onCountChange={setHistoryCount}
              />
            ),
          },
        ]}
      />
    </DrawerShell>
  );
}
