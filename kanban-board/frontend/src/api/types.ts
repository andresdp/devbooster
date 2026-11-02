import type { components } from "./schema";

type Schemas = components["schemas"];

export type BoardSummary = Schemas["BoardSummary"];
export type BoardCreated = Schemas["BoardCreated"];
export type BoardDetail = Schemas["BoardDetail"];
export type ColumnWithTickets = Schemas["ColumnWithTickets"];
export type ColumnRef = Schemas["ColumnRef"];
export type Ticket = Schemas["TicketRead"];
export type TicketType = Schemas["TicketType"];
export type Priority = Schemas["Priority"];
export type BoardCreate = Schemas["BoardCreate"];
export type TicketCreate = Schemas["TicketCreate"];
export type TicketUpdate = Schemas["TicketUpdate"];
export type TicketMove = Schemas["TicketMove"];
export type Comment = Schemas["CommentRead"];
export type CommentCreate = Schemas["CommentCreate"];
export type HistoryEntry = Schemas["HistoryEntryRead"];
export type ErrorResponse = Schemas["ErrorResponse"];
export type ErrorDetail = Schemas["ErrorDetail"];

export const TICKET_TYPES = ["bug", "feature", "task"] as const satisfies readonly TicketType[];
export const PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly Priority[];
