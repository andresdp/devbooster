import { Link } from "react-router";
import { boards } from "../../api/client";
import { Button } from "../../components/Button/Button";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ErrorState } from "../../components/ErrorState/ErrorState";
import { Skeleton } from "../../components/Skeleton/Skeleton";
import { useResource } from "../../hooks/useResource";
import { formatDateTime } from "../../model/format";
import styles from "./BoardListPage.module.css";

export function BoardListPage({ onNewBoard }: { onNewBoard: () => void }) {
  const { status, data, error, reload } = useResource(boards.list, []);

  if (status === "loading" && !data) {
    return (
      <div className={styles.page}>
        <Skeleton lines={4} label="Loading boards" />
      </div>
    );
  }
  if (status === "error" || !data) {
    return (
      <div className={styles.page}>
        <ErrorState message={error?.message ?? "Could not reach the server."} onRetry={reload} />
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="No boards yet"
          description="Create your first board to start tracking tickets."
          action={
            <Button type="button" onClick={onNewBoard}>
              New board
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Boards</h1>
      <ul className={styles.list}>
        {data.map((board) => (
          <li key={board.id} className={styles.row}>
            <Link to={`/boards/${board.id}`} className={styles.name}>
              {board.name}
            </Link>
            <span className={styles.created}>Created {formatDateTime(board.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
