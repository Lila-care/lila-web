import { formatCurrency } from "@/Admin/dashboardFormat";
import { formatBogotaDayMonth } from "@/Admin/bogotaDate";
import { DiscountDto } from "@/api/discounts";
import {
  EntitlementValue,
  FeatureDefinition,
  PlanDto,
  PlanStatus,
} from "@/api/plans";
import { isDefaultValue, planValue } from "@/Admin/plans/matrixFormat";
import { SubscriberSource, SubscriberStatus } from "@/api/subscribers";

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatBillingCycle(intervalDays: number | null): string {
  return intervalDays === null
    ? "Sin ciclo de cobro"
    : `Cada ${intervalDays} días`;
}

export function formatDailyLimit(maxInteractionsPerDay: number | null): string {
  return maxInteractionsPerDay === null
    ? "Ilimitado / día"
    : `${maxInteractionsPerDay} mensajes / día`;
}

const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  coming_soon: "Próximamente",
};

export function formatPlanStatus(status: PlanStatus): string {
  return PLAN_STATUS_LABEL[status];
}

// Daily chat quota of a plan: the entitlement, or its deprecated `maxInteractionsPerDay` mirror
// when the map doesn't carry it. `null` = unlimited.
export function resolveDailyChatLimit(plan: PlanDto): number | null {
  const value: EntitlementValue | undefined =
    plan.entitlements?.daily_chat_messages;
  return typeof value === "number" || value === null
    ? value
    : plan.maxInteractionsPerDay;
}

// --- "Características" cell of the Planes ledger (two lines, Figma A) ---

const LEARN_ACCESS_KEY = "learn_access";
const LEARN_QUOTA_KEY = "learn_articles_per_month";

function formatLearnAccess(
  entitlements: PlanDto["entitlements"],
): string | null {
  const access = entitlements[LEARN_ACCESS_KEY];
  const quota = entitlements[LEARN_QUOTA_KEY];
  if (access === false || quota === 0) return "Sin Aprende";
  if (quota === null) return "Aprende ilimitado";
  return typeof quota === "number" ? `Aprende ${quota}/mes` : null;
}

// The Aprende features (access + monthly quota) are both at their catalog default
// (resolved value === default) — what "Por defecto" next to the Aprende text means.
function usesLearnDefaults(
  plan: PlanDto,
  catalog: FeatureDefinition[],
): boolean {
  return catalog
    .filter((f) => f.key === LEARN_ACCESS_KEY || f.key === LEARN_QUOTA_KEY)
    .every((f) => isDefaultValue(f, planValue(plan, f)));
}

// ["5 mensajes / día", "Aprende ilimitado · Por defecto"]. Without the catalog (still loading
// or failed) only the daily chat limit line is returned.
export function formatEntitlementLines(
  plan: PlanDto,
  catalog: FeatureDefinition[] = [],
): string[] {
  const lines = [formatDailyLimit(resolveDailyChatLimit(plan))];
  if (catalog.length === 0 || !plan.entitlements) return lines;
  const origin = usesLearnDefaults(plan, catalog)
    ? "Por defecto"
    : "Personalizado";
  const learn = formatLearnAccess(plan.entitlements);
  lines.push(learn ? `${learn} · ${origin}` : origin);
  return lines;
}

export interface PlanPromo {
  originalAmountInCents: number;
  finalAmountInCents: number;
  discount: DiscountDto;
}

function isWithinWindow(discount: DiscountDto, nowMs: number): boolean {
  return (
    new Date(discount.startsAt).getTime() <= nowMs &&
    new Date(discount.endsAt).getTime() >= nowMs
  );
}

// A plan shows at most one inline promo: the first active `static` discount (catalog-wide,
// code-less) whose validity window currently covers `now`. `custom` discounts require a code
// at checkout and are intentionally never surfaced here — see the Descuentos tab instead.
export function resolvePlanPromo(
  plan: PlanDto,
  activeDiscounts: DiscountDto[],
  now: Date = new Date(),
): PlanPromo | null {
  const nowMs = now.getTime();
  const match = activeDiscounts.find(
    (discount) =>
      discount.kind === "static" &&
      discount.planId === plan.planId &&
      isWithinWindow(discount, nowMs),
  );
  if (!match) return null;

  // Same math as computeDiscountInCents in ms-lila src/subscription/discount.service.ts (the
  // price Wompi actually charges): fixed = cents off, percentage rounded, capped at the price.
  const discountAmount =
    match.valueType === "fixed"
      ? match.value
      : Math.round((plan.amountInCents * match.value) / 100);

  return {
    originalAmountInCents: plan.amountInCents,
    finalAmountInCents: Math.max(0, plan.amountInCents - discountAmount),
    discount: match,
  };
}

// Static discounts carry an internal `AUTO-xxxx` id that is never meant to reach an admin's
// eyes — it isn't a code anyone types anywhere, just a row identifier.
export function formatDiscountCode(discount: DiscountDto): string {
  return discount.kind === "custom" ? discount.code : "Automático";
}

export function formatDiscountValue(discount: DiscountDto): string {
  return discount.valueType === "percentage"
    ? `-${discount.value}%`
    : `-${formatCurrency(discount.value)}`;
}

export function formatValidityWindow(startsAt: string, endsAt: string): string {
  return `${formatBogotaDayMonth(startsAt)} → ${formatBogotaDayMonth(endsAt)}`;
}

// "Automático · -20% · termina 28/09" — the note under a promo price in the Planes ledger
// (always an automatic discount, see resolvePlanPromo).
export function describePromo(promo: PlanPromo): string {
  const { discount } = promo;
  return `${formatDiscountCode(discount)} · ${formatDiscountValue(discount)} · termina ${formatBogotaDayMonth(discount.endsAt)}`;
}

export function isDiscountInEffect(
  discount: DiscountDto,
  now: Date = new Date(),
): boolean {
  return (
    discount.status === "active" && isWithinWindow(discount, now.getTime())
  );
}

// "18 oct 2026" — built from parts for the same reason as dashboardFormat's formatDayMonth:
// es-CO's ICU output for `month: "short"` ("18 de oct. de 2026") varies across ICU versions.
export function formatPeriodEnd(isoString: string): string {
  const parts = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(isoString));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const month = part("month").replace(".", "").slice(0, 3);
  return `${part("day")} ${month} ${part("year")}`;
}

const SUBSCRIBER_STATUS_LABEL: Record<SubscriberStatus, string> = {
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
  none: "Sin plan",
};

export function formatSubscriberStatus(status: SubscriberStatus): string {
  return SUBSCRIBER_STATUS_LABEL[status];
}

const SUBSCRIBER_SOURCE_LABEL: Record<SubscriberSource, string> = {
  paid: "Pago",
  admin_trial: "Cortesía admin",
};

export function formatSubscriberSource(source: SubscriberSource): string {
  return SUBSCRIBER_SOURCE_LABEL[source];
}

// --- Page header counters ("3 planes · 2 activos") ---

export function describePlanCount(plans: PlanDto[]): string {
  const total = pluralize(plans.length, "plan", "planes");
  if (plans.length === 0) return total;
  const active = plans.filter((plan) => plan.status === "active").length;
  return `${total} · ${pluralize(active, "activo", "activos")}`;
}

export function describeDiscountCount(discounts: DiscountDto[]): string {
  const total = pluralize(discounts.length, "descuento", "descuentos");
  if (discounts.length === 0) return total;
  const inEffect = discounts.filter((d) => isDiscountInEffect(d)).length;
  return `${total} · ${pluralize(inEffect, "vigente", "vigentes")}`;
}

// The subscriber list is cursor-paginated with no total count in the contract — "10+ " makes
// it explicit that more pages exist instead of passing the loaded page off as the total.
export function describeSubscriberCount(
  loadedCount: number,
  hasMore: boolean,
): string {
  const count = `${loadedCount}${hasMore ? "+" : ""}`;
  return `${count} ${loadedCount === 1 && !hasMore ? "suscriptora" : "suscriptoras"}`;
}

// --- Stacked (<lg) row summaries, Figma 375 (332:2255) ---

function formatPlanPrice(
  amountInCents: number,
  promo: PlanPromo | null,
): string {
  return promo
    ? `${formatCurrency(promo.originalAmountInCents)} → ${formatCurrency(promo.finalAmountInCents)}`
    : formatCurrency(amountInCents);
}

// "$45.000 → $36.000 · Cada 30 días" / "$0 · Sin ciclo · 5 msj/día" — unlimited plans omit
// the limit, matching the Figma examples.
export function summarizePlan(plan: PlanDto, promo: PlanPromo | null): string {
  const parts = [
    formatPlanPrice(plan.amountInCents, promo),
    plan.intervalDays === null
      ? "Sin ciclo"
      : formatBillingCycle(plan.intervalDays),
  ];
  const dailyLimit = resolveDailyChatLimit(plan);
  if (dailyLimit !== null) parts.push(`${dailyLimit} msj/día`);
  return parts.join(" · ");
}

export function summarizeDiscount(discount: DiscountDto): string {
  return [
    formatDiscountCode(discount),
    formatDiscountValue(discount),
    formatValidityWindow(discount.startsAt, discount.endsAt),
  ].join(" · ");
}

export function summarizeSubscriber(
  planName: string,
  currentPeriodEnd: string | null,
  source: SubscriberSource,
): string {
  const parts = [planName];
  if (currentPeriodEnd)
    parts.push(`Vence ${formatPeriodEnd(currentPeriodEnd)}`);
  parts.push(formatSubscriberSource(source));
  return parts.join(" · ");
}
