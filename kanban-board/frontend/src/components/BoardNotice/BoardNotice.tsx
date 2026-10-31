import { Icon } from "../Icon/Icon";
import styles from "./BoardNotice.module.css";

interface Props {
  message: string | null;
  onClose: () => void;
}

export function BoardNotice({ message, onClose }: Props) {
  if (message === null) return null;
  return (
    <div role="alert" className={styles.notice}>
      <Icon name="error" />
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
  );
}
