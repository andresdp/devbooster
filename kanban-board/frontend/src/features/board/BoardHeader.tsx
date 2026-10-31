import styles from "./BoardHeader.module.css";

export function BoardHeader({ name }: { name: string }) {
  return (
    <div className={styles.header}>
      <span className={styles.overline}>Board</span>
      <h1 className={styles.name} tabIndex={-1} data-board-heading>
        {name}
      </h1>
    </div>
  );
}
