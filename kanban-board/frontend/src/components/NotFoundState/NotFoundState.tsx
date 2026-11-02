import { Link } from "react-router";
import styles from "./NotFoundState.module.css";

interface Props {
  title: string;
  description?: string;
  to: string;
  linkLabel: string;
}

export function NotFoundState({ title, description, to, linkLabel }: Props) {
  return (
    <div className={styles.state}>
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
      <Link to={to} className={styles.link}>
        {linkLabel}
      </Link>
    </div>
  );
}
