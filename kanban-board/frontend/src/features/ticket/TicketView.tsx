import { useEffect, useRef, type ReactNode } from "react";
import type { ColumnWithTickets, Ticket } from "../../api/types";
import { Badge } from "../../components/Badge/Badge";
import { Button } from "../../components/Button/Button";
import { formatDateTime } from "../../model/format";
import styles from "./TicketView.module.css";

interface Props {
  ticket: Ticket;
  column: ColumnWithTickets;
  onEdit: () => void;
  focusEdit?: boolean;
  moveSlot?: ReactNode;
}

export function TicketView({ ticket, column, onEdit, focusEdit = false, moveSlot }: Props) {
  const editRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusEdit) editRef.current?.focus();
  }, [focusEdit]);

  return (
    <div className={styles.view}>
      <div className={styles.headRow}>
        <p className={styles.title}>{ticket.title}</p>
        <Button ref={editRef} type="button" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className={styles.badges}>
        <Badge variant="type" value={ticket.type} />
        <Badge variant="priority" value={ticket.priority} />
      </div>
      <p className={ticket.description ? styles.description : styles.muted}>
        {ticket.description || "No description"}
      </p>
      <p className={styles.assignee}>
        {ticket.assignee ? ticket.assignee : <em className={styles.muted}>Unassigned</em>}
      </p>
      <div className={styles.columnRow}>
        <span className={styles.columnChip}>{column.name}</span>
        {moveSlot}
      </div>
      <p className={styles.meta}>
        Created <time dateTime={ticket.created_at}>{formatDateTime(ticket.created_at)}</time> ·
        Updated <time dateTime={ticket.updated_at}>{formatDateTime(ticket.updated_at)}</time>
      </p>
    </div>
  );
}
