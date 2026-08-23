import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getPeriodSummary, type PeriodSummary } from "@/api/cycleTracking";

interface UsePeriodSummaryReturn {
  summary: PeriodSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Fetch compartido de GET /period/summary — extraído de useProfile.ts para que Calendar
// (CycleSummaryCard) pueda reusar el mismo patrón de loading/error/cleanup sin duplicar el
// useEffect. useProfile.ts sigue siendo dueño de su propio estado de `saving`/`saveCycleInfo`,
// que no depende de este hook.
export function usePeriodSummary(): UsePeriodSummaryReturn {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Incrementar este contador fuerza al useEffect de abajo a correr de nuevo sin depender de
  // un cambio real de `token` — es lo que usa `refetch` (ej. botón "Reintentar" en el estado
  // de error de CycleSummaryCard).
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPeriodSummary(token)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Error al cargar tu ciclo",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadCount]);

  const refetch = useCallback(() => setReloadCount((c) => c + 1), []);

  return { summary, loading, error, refetch };
}
