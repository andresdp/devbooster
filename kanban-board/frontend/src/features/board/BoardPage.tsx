import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useParams } from "react-router";
import { boards, tickets } from "../../api/client";
import { isApiError } from "../../api/errors";
import type { BoardDetail } from "../../api/types";
import { BoardNotice } from "../../components/BoardNotice/BoardNotice";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { Skeleton } from "../../components/Skeleton/Skeleton";
import { useResource } from "../../hooks/useResource";
import { applyMove, columnOrder, findTicket, movePayload } from "../../model/board";
import type { BoardOutletContext } from "./boardContext";
import { BoardHeader } from "./BoardHeader";
import styles from "./BoardPage.module.css";
import { BoardDnd } from "./BoardDnd";
import { Column } from "./Column";
import { TicketCreateDialog } from "./TicketCreateDialog";
import { ColumnsPager } from "./ColumnsPager";

function BoardNotFound() {
  return (
    <NotFoundState
      title="Board not found"
      description="This board does not exist or was removed."
      to="/"
      linkLabel="Back to boards"
    />
  );
}

export function BoardPage() {
  const { boardId = "" } = useParams();
  if (!/^\d+$/.test(boardId)) return <BoardNotFound />;
  return <LoadedBoard key={boardId} boardId={boardId} />;
}

type Phase = "idle" | "dragging" | "committing";
const SAVING_DELAY_MS = 300;

function LoadedBoard({ boardId }: { boardId: string }) {
  const {
    status,
    data: served,
    error,
    reload,
  } = useResource((signal) => boards.get(Number(boardId), signal), [boardId]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Local (optimistic) board: replaced on every resource update.
  const [local, setLocal] = useState<BoardDetail | undefined>(served);
  const [prevServed, setPrevServed] = useState(served);
  if (served !== prevServed) {
    setPrevServed(served);
    setLocal(served);
  }
  const board = local ?? served;

  const [phase, setPhase] = useState<Phase>("idle");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const snapshot = useRef<BoardDetail | undefined>(undefined);
  const latest = useRef<BoardDetail | undefined>(board);
  const phaseRef = useRef<Phase>("idle");
  const mounted = useRef(true);

  useEffect(() => {
    latest.current = board;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const changePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const clearNotice = useCallback(() => setNotice(null), []);

  const onDragStart = () => {
    if (phaseRef.current !== "idle") return;
    snapshot.current = latest.current;
    changePhase("dragging");
  };

  const onDragOver = (key: string, columnId: number, index: number) => {
    if (phaseRef.current !== "dragging" || !latest.current) return;
    const next = applyMove(latest.current, key, columnId, index);
    latest.current = next;
    setLocal(next);
  };

  const restore = () => {
    if (snapshot.current) {
      latest.current = snapshot.current;
      setLocal(snapshot.current);
    }
  };

  const onDragCancel = () => {
    if (phaseRef.current !== "dragging") return;
    restore();
    changePhase("idle");
  };

  const onDragEnd = async (key: string) => {
    if (phaseRef.current !== "dragging") return;
    const base = snapshot.current;
    const current = latest.current;
    const found = current ? findTicket(current, key) : undefined;
    if (!base || !current || !found) {
      restore();
      changePhase("idle");
      return;
    }
    const index = found.column.tickets.findIndex((t) => t.key === key);
    const payload = movePayload(base, key, found.column.id, index);
    if (!payload) {
      restore();
      changePhase("idle");
      return;
    }
    changePhase("committing");
    const timer = setTimeout(() => {
      if (mounted.current) setSavingKey(key);
    }, SAVING_DELAY_MS);
    try {
      await tickets.move(key, payload);
      if (!mounted.current) return;
      setNotice(null);
      reload();
    } catch (e) {
      if (!isApiError(e)) throw e;
      if (!mounted.current) return;
      restore();
      setNotice(e.message);
      if (e.code === "invalid_move") reload();
    } finally {
      clearTimeout(timer);
      if (mounted.current) {
        setSavingKey(null);
        changePhase("idle");
      }
    }
  };

  if (status === "error" && error) {
    return error.status === 404 ? (
      <BoardNotFound />
    ) : (
      <ErrorState message={error.message} onRetry={reload} />
    );
  }
  if (!board) {
    return (
      <div className={styles.page}>
        <div className={styles.columns}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" lines={3} label={`Loading column ${i + 1}`} />
          ))}
        </div>
      </div>
    );
  }

  const columns = columnOrder(board);
  const onScroll = () => {
    const row = rowRef.current;
    if (row && row.clientWidth > 0) setVisibleIndex(Math.round(row.scrollLeft / row.clientWidth));
  };
  const select = (index: number) => {
    const row = rowRef.current;
    if (row) row.scrollTo?.({ left: index * row.clientWidth, behavior: "smooth" });
  };

  return (
    <div className={styles.page}>
      <BoardHeader name={board.name} />
      <BoardNotice message={notice} onClose={clearNotice} />
      <BoardDnd
        board={board}
        disabled={phase === "committing"}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={(key) => void onDragEnd(key)}
        onDragCancel={onDragCancel}
      >
        <div ref={rowRef} className={styles.columns} onScroll={onScroll}>
          {columns.map((column, i) => (
            <Column
              key={column.id}
              column={column}
              isFirst={i === 0}
              savingKey={savingKey}
              onNewTicket={() => setNewTicketOpen(true)}
            />
          ))}
        </div>
      </BoardDnd>
      <ColumnsPager columns={columns} visibleIndex={visibleIndex} onSelect={select} />
      <Outlet
        context={
          {
            board,
            reload,
            moving: false,
            clearNotice: () => undefined,
          } satisfies BoardOutletContext
        }
      />
      {newTicketOpen ? (
        <TicketCreateDialog
          boardId={board.id}
          onClose={() => setNewTicketOpen(false)}
          onCreated={() => {
            clearNotice();
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
