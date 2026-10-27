import { Icon } from "../Icon/Icon";
import styles from "./Field.module.css";

export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className={styles.error}>
      <Icon name="error" size={14} />
      {children}
    </p>
  );
}
