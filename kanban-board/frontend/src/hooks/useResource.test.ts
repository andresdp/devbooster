import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { useResource } from "./useResource";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useResource", () => {
  it("starts loading, then resolves to ready with data", async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve("hello"), []));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe("hello");
    expect(result.current.error).toBeUndefined();
  });

  it("maps a rejection to error with the ApiError", async () => {
    const err = new ApiError({ status: 500, code: "internal_error", message: "boom" });
    const { result } = renderHook(() => useResource(() => Promise.reject(err), []));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe(err);
  });

  it("reload() returns to loading while keeping previous data", async () => {
    let n = 0;
    const second = deferred<string>();
    const { result } = renderHook(() =>
      useResource(() => (++n === 1 ? Promise.resolve("first") : second.promise), []),
    );
    await waitFor(() => expect(result.current.data).toBe("first"));
    act(() => result.current.reload());
    expect(result.current.status).toBe("loading");
    expect(result.current.data).toBe("first");
    await act(async () => {
      second.resolve("second");
      await second.promise;
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.data).toBe("second");
  });

  it("ignores a superseded load and aborts its signal", async () => {
    const first = deferred<string>();
    const signals: AbortSignal[] = [];
    const { result, rerender } = renderHook(
      ({ id }) =>
        useResource(
          (signal) => {
            signals.push(signal);
            return id === 1 ? first.promise : Promise.resolve("two");
          },
          [id],
        ),
      { initialProps: { id: 1 } },
    );
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.data).toBe("two"));
    expect(signals[0]?.aborted).toBe(true);
    await act(async () => {
      first.resolve("one");
      await first.promise;
    });
    expect(result.current.data).toBe("two");
  });

  it("aborts the in-flight signal on unmount", () => {
    let signal: AbortSignal | undefined;
    const { unmount } = renderHook(() =>
      useResource((s) => {
        signal = s;
        return new Promise<string>(() => {});
      }, []),
    );
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
