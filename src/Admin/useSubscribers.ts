import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { SubscriberListItemDto, fetchSubscribers } from "@/api/subscribers";

// Cursor-paginated, read-only list — no create/update, no filter UI (not required by the
// contract's acceptance criteria for this tab).
export function useSubscribers() {
  const { token } = useAuth();
  const [items, setItems] = useState<SubscriberListItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchSubscribers(token)
      .then((res) => {
        setItems(res.items);
        setCursor(res.nextCursor);
      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Error al cargar las suscriptoras",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!token || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await fetchSubscribers(token, {}, cursor);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar más suscriptoras",
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
    refetch: load,
    loadMore,
  };
}
