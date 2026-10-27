import type { ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./EmptyState.module.css";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className={styles.state}>
      <Icon name="inbox" size={40} />
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action}
    </div>
  );
}
