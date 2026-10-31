import { useSortable } from "@dnd-kit/sortable";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import type { Ticket } from "../../api/types";
import { Badge } from "../../components/Badge/Badge";
import { useDragDisabled } from "./dragDisabled";
import { DropPlaceholder } from "./DropPlaceholder";
import styles from "./TicketCard.module.css";

interface Props {
  ticket: Ticket;
  /** The floating copy shown in the DragOverlay. */
  dragging?: boolean;
  /** The move for this card is being committed and is slow (> 300 ms). */
  saving?: boolean;
}

function CardBody({ ticket }: { ticket: Ticket }) {
  return (
    <>
      <div className={styles.meta}>
        <span className={styles.key}>{ticket.key}</span>
        {ticket.assignee ? (
          <span className={styles.assignee}>{ticket.assignee}</span>
        ) : (
          <span className={styles.unassigned}>Unassigned</span>
        )}
      </div>
      <span className={styles.title}>{ticket.title}</span>
      <div className={styles.badges}>
        <Badge variant="type" value={ticket.type} />
        <Badge variant="priority" value={ticket.priority} />
      </div>
    </>
  );
}

function transformString(t: { x: number; y: number } | null): string | undefined {
  return t ? `translate3d(${Math.round(t.x)}px, ${Math.round(t.y)}px, 0)` : undefined;
}

export function TicketCard({ ticket, dragging = false, saving = false }: Props) {
  if (dragging) {
    return (
      <div className={`${styles.card} ${styles.dragging}`}>
        <CardBody ticket={ticket} />
      </div>
    );
  }
  return <SortableCard ticket={ticket} saving={saving} />;
}

function SortableCard({ ticket, saving }: { ticket: Ticket; saving: boolean }) {
  const disabled = useDragDisabled();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.key,
    data: { columnId: ticket.column_id },
    disabled,
  });
  const wasDragged = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragged.current = true;
  }, [isDragging]);

  const style = { transform: transformString(transform), transition };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} data-ticket-key={ticket.key}>
        <DropPlaceholder />
      </div>
    );
  }

  // The link is the single focusable element carrying the drag attributes (FR-024).
  const { role: _role, ...dragAttributes } = attributes;
  void _role;

  return (
    <Link
      ref={setNodeRef}
      to={`/boards/${ticket.board_id}/tickets/${ticket.key}`}
      aria-label={`${ticket.key} ${ticket.title}`}
      aria-busy={saving ? "true" : undefined}
      className={`${styles.card} ${saving ? styles.saving : ""}`}
      data-ticket-key={ticket.key}
      style={style}
      {...dragAttributes}
      {...listeners}
      onClick={(event) => {
        if (wasDragged.current) {
          wasDragged.current = false;
          event.preventDefault();
        }
      }}
    >
      <CardBody ticket={ticket} />
      {saving ? <span className={styles.savingLabel}>Saving move…</span> : null}
    </Link>
  );
}
