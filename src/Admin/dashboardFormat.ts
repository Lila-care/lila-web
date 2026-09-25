import { DailyCount } from "@/api/dashboard";

// `dateStr` is either a date-only string ("2026-08-09", from `byDay` entries) or a full ISO
// timestamp ("2026-08-09T10:00:00Z", from `lastActivityAt`) — only date-only strings need the
// local-midnight suffix to avoid UTC-vs-local day drift; a timestamp already has its own time.
function toLocalDate(dateStr: string): Date {
  return new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
}

export function formatDateLong(dateStr: string): string {
  return toLocalDate(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// COP has no minor unit in everyday display (Wompi, the only payment gateway integrated,
// settles in Colombian pesos — see CLAUDE.md env section) — `maximumFractionDigits: 0` avoids
// a stray ",00" on every value.
const CURRENCY_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCurrency(cents: number): string {
  return CURRENCY_FORMATTER.format(cents / 100);
}

const COUNT_FORMATTER = new Intl.NumberFormat("es-CO");

export function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value);
}

// Ledger spec (Figma 304:9) writes percentages French/Spanish-style with a space before the
// sign ("83 %"). Non-breaking so a narrow column never wraps the sign onto its own line.
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}\u00a0%`;
}

// Share of `part` over `total` as a 0..1 ratio — 0 when there is no total, so a breakdown with
// no subscribers renders empty bars instead of NaN widths.
export function toRatio(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

// "12 sep" — built from parts because es-CO's ICU output for `month: "short"` ("12 de sept")
// varies across ICU versions and doesn't match the Figma copy.
function formatDayMonth(dateStr: string): string {
  const parts = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
  }).formatToParts(toLocalDate(dateStr));
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = (parts.find((p) => p.type === "month")?.value ?? "")
    .replace(".", "")
    .slice(0, 3);
  return `${day} ${month}`;
}

// Highest day in the range, or null when every day is zero (nothing worth calling a peak).
export function findPeak(byDay: DailyCount[]): DailyCount | null {
  return byDay.reduce<DailyCount | null>(
    (peak, day) => (day.count > (peak?.count ?? 0) ? day : peak),
    null,
  );
}

export function describePeak(byDay: DailyCount[]): string {
  const peak = findPeak(byDay);
  if (!peak) return "Sin actividad en el periodo";
  return `Pico: ${formatCount(peak.count)} el ${formatDayMonth(peak.date)}`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

// `dateStr` is `lastActivityAt` from the BE contract: a full ISO timestamp, or `null` for a
// profile with no recorded activity yet (BE puts those last when sorting, but they still need
// an explicit label here instead of falling through to "Invalid Date").
export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Sin actividad";

  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < MINUTE_MS) return "hace un momento";
  if (diffMs < HOUR_MS) return `hace ${Math.floor(diffMs / MINUTE_MS)} min`;
  if (diffMs < DAY_MS) return `hace ${Math.floor(diffMs / HOUR_MS)} h`;
  if (diffMs < MONTH_MS) {
    const days = Math.floor(diffMs / DAY_MS);
    return days === 1 ? "ayer" : `hace ${days} días`;
  }
  const months = Math.floor(diffMs / MONTH_MS);
  return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
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
