import { useEffect, useState } from "react";
import { getMoonPhaseRange, type MoonPhaseRangeDay } from "@/api/cycleTracking";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UsePhaseHeroMoonReturn {
  moon: MoonPhaseRangeDay | null;
  loading: boolean;
}

// Dato lunar de hoy para PhaseHeroCard — mismo endpoint público que useCalendar
// (GET /moon-phase/range), pedido como rango de un solo día (start=end=hoy) en vez de
// reimplementar el cálculo sinódico client-side (ver git history de src/lib/moonPhase.ts,
// eliminado). No hay error general de tarjeta: si falla o vuelve vacío, `moon` queda en null
// y PhaseHeroCard oculta el widget — mismo criterio que DayDetailPanel usa para el bloque
// lunar del calendario.
export function usePhaseHeroMoon(): UsePhaseHeroMoonReturn {
  const [moon, setMoon] = useState<MoonPhaseRangeDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = todayIsoDate();

    getMoonPhaseRange(today, today)
      .then((range) => {
        if (cancelled) return;
        setMoon(range[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setMoon(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { moon, loading };
}
