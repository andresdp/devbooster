import { describe, expect, it } from "vitest";
import { formatDateTime, initials } from "./format";

describe("formatDateTime", () => {
  it("formats an ISO timestamp in the local medium date + short time style", () => {
    const iso = "2026-10-20T10:12:00Z";
    expect(formatDateTime(iso)).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(iso),
      ),
    );
  });

  it("returns the raw string for invalid input", () => {
    expect(formatDateTime("not a date")).toBe("not a date");
  });
});

describe("initials", () => {
  it("uses the first letters of the first two words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("ada")).toBe("A");
  });

  it("falls back to ? for an empty name", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
