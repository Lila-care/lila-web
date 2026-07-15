import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  getPeriodSummary,
  getUserPhaseMetrics,
  type PeriodSummary,
  type DayPhaseUiModel,
} from "@/api/cycleTracking";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UseHoyReturn {
  summary: PeriodSummary | null;
  week: DayPhaseUiModel[];
  today: DayPhaseUiModel | null;
  loading: boolean;
  error: string | null;
}

// Trae el resumen del ciclo y la semana de fases; deriva la fase de "hoy" del elemento con
// isToday:true en vez de reimplementar la lógica de resolución de fase en el FE (vive en
// ms-lila/src/user-phase/user-phase.service.ts).
export function useHoy(): UseHoyReturn {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [week, setWeek] = useState<DayPhaseUiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getPeriodSummary(token),
      getUserPhaseMetrics(token, todayIsoDate()),
    ])
      .then(([summaryRes, weekRes]) => {
        if (cancelled) return;
        setSummary(summaryRes);
        setWeek(weekRes);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Error al cargar tu ciclo",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const today = week.find((day) => day.isToday) ?? null;

  return { summary, week, today, loading, error };
}
