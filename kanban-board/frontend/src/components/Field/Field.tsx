import { useId, type ReactNode } from "react";
import { FieldError } from "./FieldError";
import styles from "./Field.module.css";

export interface ControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
}

interface Props {
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  children: (controlProps: ControlProps) => ReactNode;
}

export function Field({ label, required, error, hint, children }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? (
          <span className={styles.asterisk} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
