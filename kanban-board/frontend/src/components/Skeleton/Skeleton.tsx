import styles from "./Skeleton.module.css";

interface Props {
  lines?: number;
  variant?: "card" | "line";
  label?: string;
}

export function Skeleton({ lines = 3, variant = "line", label = "Loading" }: Props) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]}`}
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.bar} />
      ))}
    </div>
  );
}
