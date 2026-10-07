import { useCallback, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { fetchSubscriptionStats } from "@/api/subscriptionStats";

const CHECK_ERROR =
  "No pudimos verificar las suscriptoras del plan. No se guardó nada; se puede reintentar.";

// Subscribers of a plan, read on demand from GET /admin/subscription/stats (`byPlan`) when a
// save might reduce access — the stats scan the table, so it is not loaded with the page.
// `count` resolves to null (with `error` set) when the number can't be known: the caller must
// then NOT save.
export function useSubscriberCount() {
  const { token } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = useCallback(
    async (planId: string): Promise<number | null> => {
      if (!token) return null;
      setChecking(true);
      setError(null);
      try {
        const stats = await fetchSubscriptionStats(token);
        const entry = stats.byPlan.find((p) => p.planId === planId);
        if (!entry) return 0;
        // Old BE without `activeCount`: N can't be trusted, treat as a failed check.
        if (typeof entry.activeCount !== "number") {
          throw new Error("stats.byPlan[].activeCount missing");
        }
        return entry.activeCount;
      } catch {
        setError(CHECK_ERROR);
        return null;
      } finally {
        setChecking(false);
      }
    },
    [token],
  );

  return { count, checking, error };
}
