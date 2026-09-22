import { formatCurrency, formatDateShort } from "@/Admin/dashboardFormat";
import { DiscountDto } from "@/api/discounts";
import { PlanDto, PlanStatus } from "@/api/plans";
import { SubscriberSource, SubscriberStatus } from "@/api/subscribers";

export function formatBillingCycle(intervalDays: number | null): string {
  return intervalDays === null
    ? "Sin ciclo de cobro"
    : `Cada ${intervalDays} días`;
}

export function formatDailyLimit(maxInteractionsPerDay: number | null): string {
  return maxInteractionsPerDay === null
    ? "Ilimitado"
    : `${maxInteractionsPerDay} / día`;
}

export function formatPlanStatus(status: PlanStatus): string {
  return status === "active" ? "Activo" : "Inactivo";
}

export interface PlanPromo {
  originalAmountInCents: number;
  finalAmountInCents: number;
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
      new Date(discount.startsAt).getTime() <= nowMs &&
      new Date(discount.endsAt).getTime() >= nowMs,
  );
  if (!match) return null;

  const discountAmount =
    match.valueType === "fixed"
      ? match.value
      : Math.round((plan.amountInCents * match.value) / 100);

  return {
    originalAmountInCents: plan.amountInCents,
    finalAmountInCents: Math.max(0, plan.amountInCents - discountAmount),
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
  return `${formatDateShort(startsAt)} → ${formatDateShort(endsAt)}`;
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
