import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError, type ApiError } from "../api/errors";

export interface Action<A extends unknown[], R> {
  execute: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: ApiError | undefined;
  reset: () => void;
}

/** Runs a mutation once at a time; `ApiError`s land in `error`, anything else is rethrown. */
export function useAction<A extends unknown[], R>(run: (...args: A) => Promise<R>): Action<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const runRef = useRef(run);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: A): Promise<R | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      return await runRef.current(...args);
    } catch (e) {
      if (!isApiError(e)) throw e;
      if (mounted.current) setError(e);
      return undefined;
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(undefined), []);

  return { execute, pending, error, reset };
}
