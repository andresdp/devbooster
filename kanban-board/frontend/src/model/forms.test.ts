import { describe, expect, it } from "vitest";
import type { Ticket } from "../api/types";
import { diffTicket, required, requiredErrors } from "./forms";

describe("required", () => {
  it("flags empty and whitespace-only values", () => {
    expect(required("")).toBe("Required");
    expect(required("   ")).toBe("Required");
  });

  it("accepts a value", () => {
    expect(required("x")).toBeUndefined();
  });
});

describe("requiredErrors", () => {
  it("returns only the missing required keys", () => {
    const values = { title: " ", description: "", assignee: "Ada" };
    expect(requiredErrors(values, ["title", "assignee"])).toEqual({ title: "Required" });
  });

  it("returns an empty object when nothing is missing", () => {
    expect(requiredErrors({ title: "a" }, ["title"])).toEqual({});
  });
});

describe("diffTicket", () => {
  const original: Ticket = {
    key: "TKT-1",
    board_id: 1,
    column_id: 1,
    position: 0,
    title: "Title",
    description: "Desc",
    type: "task",
    priority: "medium",
    assignee: "Ada",
    created_at: "2026-10-20T10:00:00Z",
    updated_at: "2026-10-20T10:00:00Z",
  };
  const same = {
    title: "Title",
    description: "Desc",
    type: "task" as const,
    priority: "medium" as const,
    assignee: "Ada",
  };

  it("returns {} when nothing changed", () => {
    expect(diffTicket(original, same)).toEqual({});
  });

  it("includes only the changed title", () => {
    expect(diffTicket(original, { ...same, title: "New" })).toEqual({ title: "New" });
  });

  it("sends null when the assignee is cleared", () => {
    expect(diffTicket(original, { ...same, assignee: "  " })).toEqual({ assignee: null });
  });

  it("sends an empty string when the description is cleared", () => {
    expect(diffTicket(original, { ...same, description: "" })).toEqual({ description: "" });
  });

  it("includes type and priority changes and never untouched fields", () => {
    expect(diffTicket(original, { ...same, type: "bug", priority: "high" })).toEqual({
      type: "bug",
      priority: "high",
    });
  });

  it("does not send assignee null when it was already unassigned", () => {
    expect(diffTicket({ ...original, assignee: null }, { ...same, assignee: "" })).toEqual({});
  });
});
