import { useCallback, useEffect, useState } from "react";
import { isApiError, type ApiError } from "../api/errors";

export interface Resource<T> {
  status: "loading" | "ready" | "error";
  data: T | undefined;
  error: ApiError | undefined;
  reload: () => void;
}

interface State<T> {
  status: Resource<T>["status"];
  data: T | undefined;
  error: ApiError | undefined;
}

function isAbortError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "AbortError";
}

/** Loads a resource; a superseded or unmounted load is aborted and its result ignored. */
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): Resource<T> {
  const [state, setState] = useState<State<T>>({
    status: "loading",
    data: undefined,
    error: undefined,
  });
  const [generation, setGeneration] = useState(0);
  const [prevDeps, setPrevDeps] = useState(deps);

  // Dependencies changed: show loading in this same render instead of from inside the effect.
  if (prevDeps.length !== deps.length || prevDeps.some((d, i) => !Object.is(d, deps[i]))) {
    setPrevDeps(deps);
    setState((prev) => ({ ...prev, status: "loading", error: undefined }));
  }

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    load(controller.signal).then(
      (data) => {
        if (current) setState({ status: "ready", data, error: undefined });
      },
      (e: unknown) => {
        if (!current || isAbortError(e)) return;
        if (!isApiError(e)) throw e;
        setState((prev) => ({ status: "error", data: prev.data, error: e }));
      },
    );
    return () => {
      current = false;
      controller.abort();
    };
    // `load` is intentionally excluded: callers pass an inline function and list its inputs in `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, generation]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, status: "loading", error: undefined }));
    setGeneration((g) => g + 1);
  }, []);

  return { ...state, reload };
}
