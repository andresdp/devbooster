import { useEffect, useRef } from "react";
import { history } from "../../api/client";
import type { HistoryEntry } from "../../api/types";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { Icon } from "../../components/Icon/Icon";
import { Skeleton } from "../../components/Skeleton/Skeleton";
import { useResource } from "../../hooks/useResource";
import { formatDateTime } from "../../model/format";
import { InlineError } from "./InlineError";
import styles from "./HistoryTab.module.css";

interface Props {
  ticketKey: string;
  /** Changing this value refetches the history (after a move). */
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const label = entry.from_column
    ? `${entry.from_column.name} → ${entry.to_column.name}`
    : `Created in ${entry.to_column.name}`;
  return (
    <li className={styles.item}>
      <Icon name="history" />
      <span>{label}</span>
      <time dateTime={entry.changed_at}>{formatDateTime(entry.changed_at)}</time>
    </li>
  );
}

export function HistoryTab({ ticketKey, refreshKey = 0, onCountChange }: Props) {
  const { status, data, error, reload } = useResource(
    (signal) => history.list(ticketKey, signal),
    [ticketKey],
  );
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    reload();
  }, [refreshKey, reload]);

  useEffect(() => {
    if (data) onCountChange?.(data.length);
  }, [data, onCountChange]);

  if (!data && status !== "error") return <Skeleton lines={3} label="Loading history" />;
  if (!data && error) return <InlineError message={error.message} onRetry={reload} />;
  if (!data || data.length === 0) return <EmptyState title="No history yet" />;
  return (
    <ul className={styles.list}>
      {data.map((entry) => (
        <HistoryItem key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
