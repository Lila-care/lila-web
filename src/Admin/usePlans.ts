import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { listPlans, PlanDto } from "@/api/plans";

export function usePlans() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    listPlans(token)
      .then(setPlans)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error al cargar los planes"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { plans, loading, error, refetch };
}
