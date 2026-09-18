import type { ReactNode } from "react";
import { Card } from "@lila-care/design-system";
import type { PlanDto } from "@/api/checkout";
import { formatBillingPeriod } from "./billingPeriod";
import { formatCop } from "./formatCop";

interface PlanSummaryCardProps {
  plan: PlanDto;
  codeField: ReactNode;
  totals: ReactNode;
}

export default function PlanSummaryCard({
  plan,
  codeField,
  totals,
}: PlanSummaryCardProps) {
  return (
    <Card
      data-testid="plan-summary"
      className="gap-5 rounded-2xl border-border-default bg-surface-default px-6 text-text-primary"
    >
      <h2 id="summary-heading" className="text-base font-semibold">
        Resumen de tu plan
      </h2>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-text-secondary">{plan.description}</p>
        )}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span
          data-testid="plan-price"
          className="text-4xl font-bold tabular-nums"
        >
          {formatCop(plan.amountInCents)}
        </span>
        <span className="text-sm text-text-secondary">
          {formatBillingPeriod(plan.intervalDays)}
        </span>
      </p>
      <div className="border-t border-border-default pt-5">{codeField}</div>
      {totals}
    </Card>
  );
}
