import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";
import styles from "./ErrorState.module.css";

interface Props {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div role="alert" className={styles.state}>
      <Icon name="error" size={40} />
      <p className={styles.message}>{message}</p>
      <Button type="button" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
