const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Human-readable local date and time; the raw string when it is not a valid timestamp. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTime.format(date);
}

/** Up to two uppercase initials from a free-text name, `?` when empty. */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase());
  return letters.join("") || "?";
}
