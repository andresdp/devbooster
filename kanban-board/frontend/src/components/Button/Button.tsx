import type { ButtonHTMLAttributes, Ref } from "react";
import styles from "./Button.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  pending?: boolean;
  pendingLabel?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  pending = false,
  pendingLabel,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");
  return (
    <button
      {...rest}
      className={classes}
      disabled={disabled || pending}
      aria-busy={pending ? "true" : undefined}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
