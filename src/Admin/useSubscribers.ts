import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { SubscriberListItemDto, fetchSubscribers } from "@/api/subscribers";
import { toPlansErrorMessage } from "@/Admin/plansErrors";

// Cursor-paginated, read-only list — no create/update, no filter UI (not required by the
// contract's acceptance criteria for this tab). `enabled` defers the first request until the
// Suscriptoras tab is opened: the BE scans the subscription table on every call.
//
// `error` is only for the first page (it replaces the list); a failed "Cargar más" sets
// `loadMoreError` instead, keeps the rows already shown and keeps the same cursor so the retry
// asks for the same page.
export function useSubscribers(enabled = true) {
  const { token } = useAuth();
  const [items, setItems] = useState<SubscriberListItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Bumped by every first-page load; a page (first or "more") resolving under an older id is
  // dropped so it can't overwrite or append to a newer list.
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    if (!token || !enabled) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const res = await fetchSubscribers(token);
      if (requestId !== requestIdRef.current) return;
      setItems(res.items);
      setCursor(res.nextCursor);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(toPlansErrorMessage(e, "Intentá de nuevo en unos segundos."));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!token || !cursor) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const res = await fetchSubscribers(token, {}, cursor);
      if (requestId !== requestIdRef.current) return;
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setLoadMoreError(
        toPlansErrorMessage(e, "No pudimos cargar más suscriptoras."),
      );
    } finally {
      setLoadingMore(false);
    }
  }, [token, cursor]);

  return {
    items,
    hasMore: cursor !== null,
    loading,
    loadingMore,
    error,
    loadMoreError,
    refetch: load,
    loadMore,
  };
}
