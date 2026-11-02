import type { Priority, Ticket, TicketType, TicketUpdate } from "../api/types";

export const REQUIRED_MESSAGE = "Required";

export interface FormState<TValues> {
  values: TValues;
  fieldErrors: Partial<Record<keyof TValues, string>>;
  formError: string | null;
  pending: boolean;
}

/** The only client-side validation: a value is missing when it is empty after trimming. */
export function required(value: string): string | undefined {
  return value.trim() === "" ? REQUIRED_MESSAGE : undefined;
}

export function requiredErrors<T extends Record<string, string>>(
  values: T,
  fields: (keyof T)[],
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const field of fields) {
    const message = required(values[field] ?? "");
    if (message) errors[field] = message;
  }
  return errors;
}

export interface TicketFormValues {
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  assignee: string;
}

/** The PATCH body: only fields whose value differs from the loaded ticket. */
export function diffTicket(original: Ticket, values: TicketFormValues): TicketUpdate {
  const diff: TicketUpdate = {};
  const title = values.title.trim();
  if (title !== original.title) diff.title = title;
  if (values.description !== original.description) diff.description = values.description;
  if (values.type !== original.type) diff.type = values.type;
  if (values.priority !== original.priority) diff.priority = values.priority;
  const assignee = values.assignee.trim();
  if (assignee === "") {
    if (original.assignee !== null) diff.assignee = null;
  } else if (assignee !== original.assignee) {
    diff.assignee = assignee;
  }
  return diff;
}
