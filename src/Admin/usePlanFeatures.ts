import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { FeatureDefinition, fetchPlanFeatures } from "@/api/plans";
import { toPlansErrorMessage } from "@/Admin/plansErrors";

const LOAD_ERROR = "Intentá de nuevo en unos segundos.";

// Loads the plan feature catalog (GET /admin/subscription/features): the source of truth for
// which characteristics exist, their type/unit and defaults. Static per deploy, so it is
// fetched once per mount; `refetch` is the retry for a failed load.
export function usePlanFeatures() {
  const { token } = useAuth();
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may write state — an older one resolving late is dropped.
  const requestIdRef = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    if (!token) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const catalog = await fetchPlanFeatures(token);
      if (requestId !== requestIdRef.current) return;
      setFeatures(catalog);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(toPlansErrorMessage(e, LOAD_ERROR));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { features, loading, error, refetch: load };
}

export type PlanFeaturesState = ReturnType<typeof usePlanFeatures>;
