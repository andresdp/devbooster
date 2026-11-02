import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/errors";
import { useAction } from "./useAction";

const apiError = () => new ApiError({ status: 422, code: "validation_error", message: "Invalid" });

describe("useAction", () => {
  it("is pending during execute and not after", async () => {
    let finish!: (v: string) => void;
    const run = () => new Promise<string>((res) => (finish = res));
    const { result } = renderHook(() => useAction(run));
    let done!: Promise<string | undefined>;
    act(() => {
      done = result.current.execute();
    });
    expect(result.current.pending).toBe(true);
    await act(async () => {
      finish("ok");
      await done;
    });
    expect(result.current.pending).toBe(false);
  });

  it("ignores a second execute while pending", async () => {
    let finish!: (v: string) => void;
    const run = vi.fn(() => new Promise<string>((res) => (finish = res)));
    const { result } = renderHook(() => useAction(run));
    let first!: Promise<string | undefined>;
    act(() => {
      first = result.current.execute();
    });
    let second: string | undefined = "unset";
    await act(async () => {
      second = await result.current.execute();
    });
    expect(second).toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish("ok");
      await first;
    });
  });

  it("sets error on rejection and resolves undefined", async () => {
    const err = apiError();
    const { result } = renderHook(() => useAction(() => Promise.reject(err)));
    let value: unknown = "unset";
    await act(async () => {
      value = await result.current.execute();
    });
    expect(value).toBeUndefined();
    expect(result.current.error).toBe(err);
  });

  it("resolves the value on success and clears a previous error", async () => {
    let fail = true;
    const { result } = renderHook(() =>
      useAction(() => (fail ? Promise.reject(apiError()) : Promise.resolve(42))),
    );
    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBeDefined();
    fail = false;
    let value: number | undefined;
    await act(async () => {
      value = await result.current.execute();
    });
    expect(value).toBe(42);
    expect(result.current.error).toBeUndefined();
  });

  it("reset() clears the error", async () => {
    const { result } = renderHook(() => useAction(() => Promise.reject(apiError())));
    await act(async () => {
      await result.current.execute();
    });
    act(() => result.current.reset());
    expect(result.current.error).toBeUndefined();
  });

  it("does not set state after unmount", async () => {
    let finish!: (v: string) => void;
    const run = () => new Promise<string>((res) => (finish = res));
    const { result, unmount } = renderHook(() => useAction(run));
    let done!: Promise<string | undefined>;
    act(() => {
      done = result.current.execute();
    });
    unmount();
    finish("late");
    await expect(done).resolves.toBe("late");
  });

  it("rethrows non-ApiError rejections", async () => {
    const { result } = renderHook(() => useAction(() => Promise.reject(new Error("bug"))));
    await act(async () => {
      await expect(result.current.execute()).rejects.toThrow("bug");
    });
  });
});
