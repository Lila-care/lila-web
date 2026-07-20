import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  getMoonPhaseRange,
  getUserPhaseMetrics,
  type DayOfWeek,
  type DayPhaseUiModel,
  type MoonPhaseName,
  type MoonPhaseRangeDay,
  type PhaseName,
} from "@/api/cycleTracking";

const DAY_OF_WEEK_NAMES: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
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

// Rango YYYY-MM-01..último día del mes — a diferencia de /user-phase/metrics (semanal, BE de
// fases), /moon-phase/range acepta cualquier rango arbitrario, así que alcanza una sola llamada.
function monthDateRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    start: `${year}-${pad2(month + 1)}-01`,
    end: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
  };
}

function allDatesInMonth(year: number, month: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from(
    { length: daysInMonth },
    (_, i) => `${year}-${pad2(month + 1)}-${pad2(i + 1)}`,
  );
}

// Modelo de día que consumen MonthGrid/DayDetailPanel — superset de DayPhaseUiModel (contrato
// exacto de /user-phase/metrics) con los campos de luna (/moon-phase/range, público). No extiende
// DayPhaseUiModel directamente: para una usuaria guest hay días con dato de luna pero sin dato de
// fase (no hay token para pedirla), así que los campos de fase no pueden ser obligatorios aquí.
export interface CalendarDayUiModel {
  date: string;
  isToday: boolean;
  dayOfWeekIndex: number;
  dayOfWeek: DayOfWeek;
  phaseName: PhaseName | null;
  moonPhaseName: MoonPhaseName | null;
  moonIllumination: number | null;
}

function baseDayForDate(date: string, todayIso: string): CalendarDayUiModel {
  const dayOfWeekIndex = new Date(`${date}T00:00:00Z`).getUTCDay();
  return {
    date,
    isToday: date === todayIso,
    dayOfWeekIndex,
    dayOfWeek: DAY_OF_WEEK_NAMES[dayOfWeekIndex],
    phaseName: null,
    moonPhaseName: null,
    moonIllumination: null,
  };
}

// Combina la lista completa de días del mes visible con lo que ya haya llegado de cada fuente.
// Cada Map se llena de forma independiente (ver los dos useEffect de useCalendario) — una fuente
// sin datos todavía (o que falló) simplemente deja sus campos en null en el día combinado.
function buildCalendarDays(
  year: number,
  month: number,
  phaseByDate: Map<string, DayPhaseUiModel>,
  moonByDate: Map<string, MoonPhaseRangeDay>,
): CalendarDayUiModel[] {
  const todayIso = toIsoDate(new Date());
  const merged = new Map<string, CalendarDayUiModel>(
    allDatesInMonth(year, month).map((date) => [
      date,
      baseDayForDate(date, todayIso),
    ]),
  );

  // Solo transplanta `phaseName` — el `isToday` que devuelve cada llamada semanal está
  // calculado contra el anchor de ESA semana (no contra la fecha real de hoy), así que un
  // spread completo pisaría el `isToday` correcto de `baseDayForDate` con el del anchor de
  // cada semana pedida (ver weekAnchorDatesForMonth: cada semana visible se pide con un
  // anchor distinto, y el BE marca `isToday` comparando contra ese anchor).
  phaseByDate.forEach((day, date) => {
    const existing = merged.get(date) ?? baseDayForDate(date, todayIso);
    merged.set(date, { ...existing, phaseName: day.phaseName });
  });

  moonByDate.forEach((day, date) => {
    const existing = merged.get(date);
    if (!existing) return;
    merged.set(date, {
      ...existing,
      moonPhaseName: day.phaseName,
      moonIllumination: day.illumination,
    });
  });

  return Array.from(merged.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

interface UseCalendarioReturn {
  year: number;
  month: number; // 0-indexed
  days: CalendarDayUiModel[];
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
  const [phaseByDate, setPhaseByDate] = useState<Map<string, DayPhaseUiModel>>(
    new Map(),
  );
  const [moonByDate, setMoonByDate] = useState<Map<string, MoonPhaseRangeDay>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fase de ciclo — requiere auth. Sin token (guest), no corre y `loading` se resuelve de
  // inmediato; el calendario sigue mostrando la grilla, solo sin colores de fase.
  useEffect(() => {
    if (!token) {
      setPhaseByDate(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      weekAnchorDatesForMonth(year, month).map((anchor) =>
        getUserPhaseMetrics(token, anchor),
      ),
    )
      .then((weeks) => {
        if (cancelled) return;
        const byDate = new Map<string, DayPhaseUiModel>();
        weeks.flat().forEach((day) => byDate.set(day.date, day));
        setPhaseByDate(byDate);
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

  // Dato lunar — endpoint público, deliberadamente en su propio efecto con deps [year, month]
  // (sin `token`): corre para cualquier usuaria, incluidas guests, y no se re-fetchea cada vez
  // que cambia la sesión (ej. hidratación async del token al montar), solo cuando cambia el mes
  // visible. Es un dato complementario no crítico: si falla, se resuelve en silencio y los días
  // quedan con moonPhaseName/moonIllumination en null — MonthGrid/DayDetailPanel ya ocultan el
  // ícono/bloque en ese caso, sin bloquear ni mostrar el error general del calendario.
  useEffect(() => {
    let cancelled = false;
    const { start, end } = monthDateRange(year, month);

    getMoonPhaseRange(start, end)
      .then((range) => {
        if (cancelled) return;
        setMoonByDate(new Map(range.map((day) => [day.date, day])));
      })
      .catch(() => {
        if (!cancelled) setMoonByDate(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const days = useMemo(
    () => buildCalendarDays(year, month, phaseByDate, moonByDate),
    [year, month, phaseByDate, moonByDate],
  );

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

  return {
    year,
    month,
    days,
    loading,
    error,
    goToPreviousMonth,
    goToNextMonth,
  };
}
