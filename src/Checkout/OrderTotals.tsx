import type { ReactNode } from "react";
import { cn } from "@lila-care/design-system";
import { formatCop } from "./formatCop";

interface OrderTotalsProps {
  listInCents: number;
  discountInCents: number;
  totalInCents: number;
  // Label of the discount line ("Descuento LILA20" / "Promoción").
  discountLabel: string;
}

function Row({
  label,
  testId,
  className,
  children,
}: {
  label: string;
  testId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
        className,
      )}
    >
      <dt className="min-w-0 text-sm text-text-secondary">{label}</dt>
      <dd className="text-sm tabular-nums text-text-primary">{children}</dd>
    </div>
  );
}

export default function OrderTotals({
  listInCents,
  discountInCents,
  totalInCents,
  discountLabel,
}: OrderTotalsProps) {
  const hasDiscount = discountInCents > 0;

  return (
    <dl
      data-testid="order-totals"
      className="flex flex-col gap-3 rounded-[12px] bg-surface-subtle p-4"
    >
      <Row label="Subtotal">{formatCop(listInCents)}</Row>
      {hasDiscount && (
        <Row label={discountLabel} testId="discount-row">
          <span className="text-feedback-success-text">
            -{formatCop(discountInCents)}
          </span>
        </Row>
      )}
      <Row label="Total" className="border-t border-border-default pt-3">
        <span className="flex flex-wrap items-baseline justify-end gap-x-2">
          {hasDiscount && (
            <del className="text-text-secondary">
              <span className="sr-only">Precio original: </span>
              {formatCop(listInCents)}
            </del>
          )}
          <span data-testid="summary-total" className="text-base font-semibold">
            {formatCop(totalInCents)}
          </span>
        </span>
      </Row>
    </dl>
  );
}
