const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// The BE speaks cents (Wompi convention); COP is shown without decimals.
export function formatCop(amountInCents: number): string {
  return copFormatter.format(amountInCents / 100);
}
