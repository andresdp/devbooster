import { ApiError } from "./errors";
import type {
  BoardCreate,
  BoardCreated,
  BoardDetail,
  BoardSummary,
  Comment,
  CommentCreate,
  ErrorResponse,
  HistoryEntry,
  Ticket,
  TicketCreate,
  TicketMove,
  TicketUpdate,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const PREFIX = "/api/v1";

type Method = "GET" | "POST" | "PATCH";

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const error = body.error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

function isAbortError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "AbortError";
}

function unexpected(status: number): ApiError {
  return new ApiError({
    status,
    code: "unexpected_response",
    message: `Unexpected response from the server (${status}).`,
  });
}

async function request<T>(
  method: Method,
  path: string,
  { body, signal }: { body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${PREFIX}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new ApiError({
      status: 0,
      code: "network_error",
      message: "Could not reach the server.",
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw unexpected(response.status);
  }

  if (response.status >= 400) {
    if (isErrorResponse(payload)) {
      const { code, message, details } = payload.error;
      throw new ApiError({ status: response.status, code, message, details });
    }
    throw unexpected(response.status);
  }
  return payload as T;
}

const seg = encodeURIComponent;

export const boards = {
  list: (signal?: AbortSignal) => request<BoardSummary[]>("GET", "/boards", { signal }),
  create: (body: BoardCreate) => request<BoardCreated>("POST", "/boards", { body }),
  get: (id: number, signal?: AbortSignal) =>
    request<BoardDetail>("GET", `/boards/${seg(String(id))}`, { signal }),
};

export const tickets = {
  create: (boardId: number, body: TicketCreate) =>
    request<Ticket>("POST", `/boards/${seg(String(boardId))}/tickets`, { body }),
  get: (key: string, signal?: AbortSignal) =>
    request<Ticket>("GET", `/tickets/${seg(key)}`, { signal }),
  update: (key: string, body: TicketUpdate) =>
    request<Ticket>("PATCH", `/tickets/${seg(key)}`, { body }),
  move: (key: string, body: TicketMove) =>
    request<Ticket>("POST", `/tickets/${seg(key)}/move`, { body }),
};

export const comments = {
  list: (key: string, signal?: AbortSignal) =>
    request<Comment[]>("GET", `/tickets/${seg(key)}/comments`, { signal }),
  add: (key: string, body: CommentCreate) =>
    request<Comment>("POST", `/tickets/${seg(key)}/comments`, { body }),
};

export const history = {
  list: (key: string, signal?: AbortSignal) =>
    request<HistoryEntry[]>("GET", `/tickets/${seg(key)}/history`, { signal }),
};
