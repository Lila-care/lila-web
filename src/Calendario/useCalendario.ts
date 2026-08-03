import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getUserPhaseMetrics, type DayPhaseUiModel } from "@/api/cycleTracking";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Genera la lista de fechas (una por semana distinta) que hay que pedirle al BE para cubrir
// la grilla completa del mes visible — evita pedir 30 días individuales (dedupe por semana,
// domingo a sábado, como devuelve /user-phase/metrics/:date).
function weekAnchorDatesForMonth(year: number, month: number): string[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  const anchors = new Set<string>();
  const cursor = new Date(firstDay);
  // Retrocede al domingo de la semana que contiene el día 1.
  cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());

  while (cursor <= lastDay) {
    anchors.add(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  // Asegura que la última semana (la que contiene lastDay) quede cubierta.
  anchors.add(toIsoDate(lastDay));

  return Array.from(anchors);
}

interface UseCalendarioReturn {
  year: number;
  month: number; // 0-indexed
  days: DayPhaseUiModel[];
  loading: boolean;
  error: string | null;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

export function useCalendario(): UseCalendarioReturn {
  const { token } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth());
  const [days, setDays] = useState<DayPhaseUiModel[]>([]);
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

    const anchors = weekAnchorDatesForMonth(year, month);

    Promise.all(anchors.map((anchor) => getUserPhaseMetrics(token, anchor)))
      .then((weeks) => {
        if (cancelled) return;
        const merged = new Map<string, DayPhaseUiModel>();
        weeks.flat().forEach((day) => merged.set(day.date, day));
        setDays(Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Error al cargar el calendario",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, year, month]);

  const goToPreviousMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return { year, month, days, loading, error, goToPreviousMonth, goToNextMonth };
}
