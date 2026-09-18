const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

// Human label for a plan's billing cycle ("por mes"); `null` cycle = one-off charge.
export function formatBillingPeriod(intervalDays: number | null): string {
  if (intervalDays === null) return "pago único";
  if (intervalDays === DAYS_PER_WEEK) return "por semana";
  if (intervalDays === DAYS_PER_MONTH) return "por mes";
  if (intervalDays === DAYS_PER_YEAR) return "por año";
  return `cada ${intervalDays} días`;
}
