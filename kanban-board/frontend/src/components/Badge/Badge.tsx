import type { Priority, TicketType } from "../../api/types";
import styles from "./Badge.module.css";

type Props = { variant: "type"; value: TicketType } | { variant: "priority"; value: Priority };

export function Badge({ variant, value }: Props) {
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return <span className={`${styles.badge} ${styles[`${variant}-${value}`]}`}>{label}</span>;
}
