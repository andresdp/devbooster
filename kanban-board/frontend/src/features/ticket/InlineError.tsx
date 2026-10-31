import { Button } from "../../components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import styles from "./CommentsTab.module.css";

export function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={styles.inlineError}>
      <Icon name="error" />
      <span>{message}</span>
      <Button type="button" variant="ghost" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
