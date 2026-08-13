import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  DashboardRangeDays,
  DashboardStatsDto,
  getDashboardStats,
} from "@/api/dashboard";

const DEFAULT_RANGE_DAYS: DashboardRangeDays = 30;

// Loading has two distinct UI treatments (see design spec): a skeleton on the very first
// mount (no data to show yet) vs. a dimmed-but-still-visible previous render while a range
// change refetches. `isInitialLoading`/`isRefetching` are mutually exclusive so callers never
// have to reconcile two booleans themselves.
export function useDashboardStats(
  initialDays: DashboardRangeDays = DEFAULT_RANGE_DAYS,
) {
  const { token } = useAuth();
  const [days, setDays] = useState<DashboardRangeDays>(initialDays);
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    // `stats` here is the value from the render that scheduled this effect (days/token/
    // reloadToken changed) — not a reactive dependency. That's intentional: it tells us
    // whether this fetch is the very first one (skeleton) or a refetch over existing data
    // (dim + keep old data visible), without re-running the effect on every `stats` write.
    const isRefetch = stats !== null;
    if (isRefetch) setIsRefetching(true);
    else setIsInitialLoading(true);
    setError(null);

    getDashboardStats(token, days, controller.signal)
      .then((data) => setStats(data))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(
          e instanceof Error ? e.message : "Error al cargar el dashboard",
        );
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsInitialLoading(false);
        setIsRefetching(false);
      });

    // A newer range selection aborts whatever request is still in flight for the previous
    // one, so an obsolete response can never overwrite a fresher selection ("la última
    // selección gana", per design spec).
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, days, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return {
    stats,
    days,
    setDays,
    isInitialLoading,
    isRefetching,
    error,
    refetch,
  };
}
