import { useCallback, useRef, useState } from "react";
import { LearnApiError, type LearnErrorCode } from "@/api/learn";
import { learnErrorMessage } from "@/Admin/contentLabels";

export interface ContentMutationError {
  message: string;
  code: LearnErrorCode | null;
}

// Runs one Learn write at a time (save, submit, review, publish, generate…). `pending` names the
// action in flight so each button can show its own spinner; a second call while one is running
// is ignored, which is what prevents double submits of slow calls like AI draft generation.
export function useContentMutation() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ContentMutationError | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async <T>(action: string, task: () => Promise<T>): Promise<T | null> => {
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
      setPending(action);
      setError(null);
      try {
        return await task();
      } catch (caught) {
        setError({
          message: learnErrorMessage(caught),
          code: caught instanceof LearnApiError ? caught.code : null,
        });
        return null;
      } finally {
        inFlightRef.current = false;
        setPending(null);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { pending, error, run, clearError };
}
