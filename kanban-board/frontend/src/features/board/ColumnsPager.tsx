import type { ColumnWithTickets } from "../../api/types";
import styles from "./ColumnsPager.module.css";

interface Props {
  columns: ColumnWithTickets[];
  visibleIndex: number;
  onSelect?: (index: number) => void;
}

export function ColumnsPager({ columns, visibleIndex, onSelect }: Props) {
  return (
    <div className={styles.pager}>
      <span className={styles.label}>
        {visibleIndex + 1} / {columns.length}
      </span>
      <div className={styles.dots}>
        {columns.map((column, i) => (
          <button
            key={column.id}
            type="button"
            aria-label={column.name}
            aria-current={i === visibleIndex ? "true" : undefined}
            className={`${styles.dot} ${i === visibleIndex ? styles.current : ""}`}
            onClick={() => onSelect?.(i)}
          />
        ))}
      </div>
    </div>
  );
}
