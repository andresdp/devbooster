import type { ErrorDetail } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  details: ErrorDetail[];

  constructor({
    status,
    code,
    message,
    details,
  }: {
    status: number;
    code: string;
    message: string;
    details?: ErrorDetail[] | null;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details ?? [];
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Splits server field errors into those the form shows and the rest (first message wins). */
export function fieldErrors(
  e: ApiError,
  visible: readonly string[],
): { byField: Record<string, string>; rest: string[] } {
  const byField: Record<string, string> = {};
  const rest: string[] = [];
  for (const detail of e.details) {
    if (visible.includes(detail.field)) {
      byField[detail.field] ??= detail.message;
    } else {
      rest.push(detail.message);
    }
  }
  return { byField, rest };
}
