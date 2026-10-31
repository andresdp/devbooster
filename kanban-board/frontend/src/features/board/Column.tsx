import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ColumnWithTickets } from "../../api/types";
import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import styles from "./Column.module.css";
import { TicketCard } from "./TicketCard";

interface Props {
  column: ColumnWithTickets;
  isFirst: boolean;
  onNewTicket?: () => void;
  savingKey?: string | null;
}

function ColumnEmptyState({ name }: { name: string }) {
  return (
    <div className={styles.empty}>
      <Icon name="inbox" size={28} />
      <p className={styles.emptyTitle}>No tickets in {name}</p>
      <p className={styles.emptyHint}>Drag a ticket here or create one</p>
    </div>
  );
}

export function Column({ column, isFirst, onNewTicket, savingKey = null }: Props) {
  const { setNodeRef } = useDroppable({ id: `column-${column.id}` });
  return (
    <section className={styles.column}>
      <h2 className={styles.heading}>
        {column.name}
        <span className={styles.count}>{column.tickets.length}</span>
      </h2>
      {isFirst ? (
        <Button type="button" variant="ghost" className={styles.newTicket} onClick={onNewTicket}>
          + New ticket
        </Button>
      ) : null}
      <div ref={setNodeRef} className={styles.body} data-column-body>
        <SortableContext
          items={column.tickets.map((t) => t.key)}
          strategy={verticalListSortingStrategy}
        >
          {column.tickets.length === 0 ? (
            <ColumnEmptyState name={column.name} />
          ) : (
            column.tickets.map((ticket) => (
              <TicketCard key={ticket.key} ticket={ticket} saving={ticket.key === savingKey} />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}
