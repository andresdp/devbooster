import { Link } from "react-router";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import styles from "./AppHeader.module.css";

export function AppHeader({ onNewBoard }: { onNewBoard: () => void }) {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <Icon name="kanban" />
        Kanban
      </Link>
      <Button type="button" onClick={onNewBoard}>
        New board
      </Button>
    </header>
  );
}
