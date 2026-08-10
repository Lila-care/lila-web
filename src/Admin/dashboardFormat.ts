import { DailyCount } from "@/api/dashboard";

// `dateStr` is either a date-only string ("2026-08-09", from `byDay` entries) or a full ISO
// timestamp ("2026-08-09T10:00:00Z", from `lastActivityAt`) — only date-only strings need the
// local-midnight suffix to avoid UTC-vs-local day drift; a timestamp already has its own time.
function toLocalDate(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
}

export function formatDateShort(dateStr: string): string {
  return toLocalDate(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateLong(dateStr: string): string {
  return toLocalDate(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Coarse trend description for chart `aria-label`s — compares the average of the second
// half of the range against the first half. Deliberately not a precise statistic (the BE
// contract has no previous-period comparison field, see DashboardPage report) — just enough
// to give screen reader users a shape of the data, matching the design spec's example
// ("tendencia ascendente").
export function describeTrend(byDay: DailyCount[]): string {
  if (byDay.length < 2) return "sin variación";
  const mid = Math.floor(byDay.length / 2);
  const firstHalf = byDay.slice(0, mid);
  const secondHalf = byDay.slice(mid);
  const avg = (points: DailyCount[]) =>
    points.reduce((sum, p) => sum + p.count, 0) / points.length;
  const firstAvg = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  if (secondAvg > firstAvg * 1.1) return "tendencia ascendente";
  if (secondAvg < firstAvg * 0.9) return "tendencia descendente";
  return "tendencia estable";
}
