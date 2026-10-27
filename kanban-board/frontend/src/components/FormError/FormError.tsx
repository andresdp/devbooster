import { Icon } from "../Icon/Icon";
import styles from "./FormError.module.css";

interface Props {
  message: string | null;
  messages?: string[];
}

export function FormError({ message, messages = [] }: Props) {
  if (message === null) return null;
  return (
    <div role="alert" className={styles.banner}>
      <Icon name="error" />
      <div>
        <p className={styles.title}>Something went wrong</p>
        <p>{message}</p>
        {messages.length > 0 ? (
          <ul className={styles.list}>
            {messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
