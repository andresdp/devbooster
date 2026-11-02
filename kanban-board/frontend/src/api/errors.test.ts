import { describe, expect, it } from "vitest";
import { ApiError, fieldErrors, isApiError } from "./errors";

describe("ApiError", () => {
  it("carries status, code, message and details", () => {
    const err = new ApiError({
      status: 422,
      code: "validation_error",
      message: "Invalid",
      details: [{ field: "title", message: "required" }],
    });
    expect(err.status).toBe(422);
    expect(err.code).toBe("validation_error");
    expect(err.message).toBe("Invalid");
    expect(err.details).toEqual([{ field: "title", message: "required" }]);
  });

  it("defaults details to [] for null or undefined", () => {
    expect(new ApiError({ status: 500, code: "x", message: "m", details: null }).details).toEqual(
      [],
    );
    expect(new ApiError({ status: 500, code: "x", message: "m" }).details).toEqual([]);
  });
});

describe("isApiError", () => {
  it("is true only for ApiError instances", () => {
    expect(isApiError(new ApiError({ status: 0, code: "c", message: "m" }))).toBe(true);
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isApiError({ status: 0, code: "c", message: "m" })).toBe(false);
  });
});

describe("fieldErrors", () => {
  const make = (details: { field: string; message: string }[]) =>
    new ApiError({ status: 422, code: "validation_error", message: "Invalid", details });

  it("puts visible fields in byField (first wins) and others in rest", () => {
    const err = make([
      { field: "title", message: "first" },
      { field: "title", message: "second" },
      { field: "description", message: "too long" },
    ]);
    expect(fieldErrors(err, ["title"])).toEqual({
      byField: { title: "first" },
      rest: ["too long"],
    });
  });

  it("returns empty results for empty details", () => {
    expect(fieldErrors(make([]), ["title"])).toEqual({ byField: {}, rest: [] });
  });
});
