import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getMySubscription, SubscriptionDto } from "@/api/subscription";

export function useSubscription() {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) {
      // No hook that gates its fetch on `if (!token) return` should leave a stale object in
      // state — reset explicitly so `isEmpty` below sees the "no subscription" case correctly
      // for guests too (see lila-web memory: `summary: null` vs "object with null fields").
      setSubscription(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    getMySubscription(token)
      .then((res) => setSubscription(res.subscription))
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Error al cargar la suscripción",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Covers both "not loaded yet / guest" (subscription itself null) and "loaded, status: none"
  // (authenticated user with no subscription ever created) — see lila-web memory entry
  // 2026-07-19 for why checking only `subscription?.status` isn't enough.
  const isEmpty = !subscription || subscription.status === "none";
  const hasActiveSubscription = subscription?.status === "active";

  return {
    subscription,
    loading,
    error,
    isEmpty,
    hasActiveSubscription,
    refetch,
  };
}
