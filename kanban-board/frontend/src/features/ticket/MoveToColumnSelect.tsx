import { useState } from "react";
import { tickets } from "../../api/client";
import type { ColumnWithTickets } from "../../api/types";
import { Button } from "../../components/Button/Button";
import { useAction } from "../../hooks/useAction";
import styles from "./MoveToColumnSelect.module.css";

interface Props {
  ticketKey: string;
  currentColumnId: number;
  columns: ColumnWithTickets[];
  disabled?: boolean;
  onMoved: (columnName: string) => void;
}

export function MoveToColumnSelect({
  ticketKey,
  currentColumnId,
  columns,
  disabled = false,
  onMoved,
}: Props) {
  const others = columns.filter((c) => c.id !== currentColumnId);
  const [target, setTarget] = useState<number | undefined>(others[0]?.id);
  const [announcement, setAnnouncement] = useState("");
  const move = useAction((columnId: number) => tickets.move(ticketKey, { column_id: columnId }));
  const selected = others.some((c) => c.id === target) ? target : others[0]?.id;

  async function onMove() {
    if (selected === undefined) return;
    setAnnouncement("");
    const moved = await move.execute(selected);
    if (moved) {
      const name = columns.find((c) => c.id === selected)?.name ?? "";
      setAnnouncement(`Moved to ${name}`);
      onMoved(name);
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <label htmlFor={`move-${ticketKey}`} className={styles.label}>
          Move to
        </label>
        <select
          id={`move-${ticketKey}`}
          value={selected}
          disabled={disabled || move.pending}
          onChange={(e) => {
            setTarget(Number(e.target.value));
            move.reset();
          }}
        >
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          pending={move.pending}
          pendingLabel="Moving…"
          onClick={() => void onMove()}
        >
          Move
        </Button>
      </div>
      {move.error ? (
        <p role="alert" className={styles.error}>
          {move.error.message}
        </p>
      ) : null}
      <p aria-live="polite" className="visually-hidden">
        {announcement}
      </p>
    </div>
  );
}
