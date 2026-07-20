import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  getSubscriptionStats,
  listSubscribers,
  SubscriberListItem,
  SubscriptionStatsDto,
} from "@/api/subscribers";
import { SubscriptionStatus } from "@/api/subscription";

export function useSubscriptionStats() {
  const { token } = useAuth();
  const [stats, setStats] = useState<SubscriptionStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getSubscriptionStats(token)
      .then(setStats)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Error al cargar las estadísticas",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, error, refetch };
}

interface SubscribersFilters {
  status?: SubscriptionStatus;
  planId?: string;
}

export function useSubscribers(filters: SubscribersFilters) {
  const { token } = useAuth();
  const [items, setItems] = useState<SubscriberListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (cursor: string | undefined, append: boolean) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      listSubscribers(token, { ...filters, cursor })
        .then((page) => {
          setItems((prev) => (append ? [...prev, ...page.items] : page.items));
          setNextCursor(page.nextCursor);
        })
        .catch((e) =>
          setError(
            e instanceof Error
              ? e.message
              : "Error al cargar las suscriptoras",
          ),
        )
        .finally(() => setLoading(false));
    },
    // Re-run only when the filter values or token change, not on every `filters` object
    // identity change (the caller passes a fresh object each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, filters.status, filters.planId],
  );

  useEffect(() => {
    load(undefined, false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!nextCursor) return;
    load(nextCursor, true);
  }, [nextCursor, load]);

  return {
    items,
    loading,
    error,
    hasMore: !!nextCursor,
    loadMore,
    refetch: () => load(undefined, false),
  };
}
