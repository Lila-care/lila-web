import type { DiscountDto, DiscountValueType } from "@/api/discounts";

// Colombia has no DST: America/Bogota is a fixed UTC-5, so the day-boundary math below can use
// a constant offset instead of a date library (project convention: native Intl/Date only).
const BOGOTA_UTC_OFFSET_HOURS = 5;
const BOGOTA_TIME_ZONE = "America/Bogota";

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: BOGOTA_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export type DerivedDiscountStatus =
  "inactive" | "scheduled" | "current" | "expired";

// --- Money ---

export function formatCop(cents: number): string {
  return copFormatter.format(cents / 100);
}

export function formatDiscountValue(
  valueType: DiscountValueType,
  value: number,
): string {
  return valueType === "percentage" ? `${value} %` : formatCop(value);
}

// Same math as the BE (fixed: list − value, percentage: round(list × value / 100)); used only for
// the informative preview in the form — the BE stays the source of truth.
export function computeDiscountedPrice(
  listAmountInCents: number,
  valueType: DiscountValueType,
  value: number,
): number {
  const discountInCents =
    valueType === "fixed"
      ? value
      : Math.round((listAmountInCents * value) / 100);
  return Math.max(0, listAmountInCents - discountInCents);
}

// --- Dates (all in America/Bogota) ---

function shiftToBogota(date: Date): Date {
  return new Date(date.getTime() - BOGOTA_UTC_OFFSET_HOURS * 3_600_000);
}

// "YYYY-MM-DD" for the calendar day `date` falls on in Bogotá.
export function toBogotaDateInput(date: Date | string): string {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return shiftToBogota(parsed).toISOString().slice(0, 10);
}

export function todayInBogota(now: Date = new Date()): string {
  return toBogotaDateInput(now);
}

export function bogotaDayStartToIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00.000-05:00`).toISOString();
}

export function bogotaDayEndToIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999-05:00`).toISOString();
}

export function formatValidity(startsAt: string, endsAt: string): string {
  return `${dateFormatter.format(new Date(startsAt))} – ${dateFormatter.format(new Date(endsAt))}`;
}

// --- Status ---

// The BE only stores active|inactive, but an "active" discount past its end date does not apply;
// the admin needs to see that, so derive it from the dates.
export function getDerivedStatus(
  discount: Pick<DiscountDto, "status" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): DerivedDiscountStatus {
  if (discount.status === "inactive") return "inactive";
  if (now < new Date(discount.startsAt)) return "scheduled";
  if (now > new Date(discount.endsAt)) return "expired";
  return "current";
}

export const DERIVED_STATUS_LABEL: Record<DerivedDiscountStatus, string> = {
  inactive: "Inactivo",
  scheduled: "Programado",
  current: "Vigente",
  expired: "Vencido",
};

// --- Human description ---

// Single place that turns a discount into text. A static discount's `code` (AUTO-<hex>) is an
// internal identifier and must never reach the UI, so every surface goes through these helpers.
export function describeDiscount(
  discount: Pick<DiscountDto, "kind" | "code">,
  planName: string,
): string {
  return discount.kind === "static"
    ? `descuento automático del plan ${planName}`
    : `código ${discount.code} del plan ${planName}`;
}

export function summarizeDiscount(
  discount: Pick<DiscountDto, "kind" | "code" | "valueType" | "value">,
  planName: string,
): string {
  const application =
    discount.kind === "static" ? "Automático" : `Código ${discount.code}`;
  return `${application} · ${planName} · ${formatDiscountValue(discount.valueType, discount.value)}`;
}
