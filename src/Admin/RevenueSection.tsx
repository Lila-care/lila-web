import { SubscriptionStatsDto } from "@/api/dashboard";
import { formatCount, formatCurrency, toRatio } from "@/Admin/dashboardFormat";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { BreakdownLedgerRow } from "@/Admin/ledger/BreakdownLedgerRow";
import type { StatusMarkerShape } from "@/Admin/ledger/StatusMarker";

interface RevenueSectionProps {
  subscriptions: SubscriptionStatsDto;
}

interface StatusRow {
  key: keyof SubscriptionStatsDto["byStatus"];
  label: string;
  marker: StatusMarkerShape;
}

const STATUS_ROWS: StatusRow[] = [
  { key: "active", label: "Activas", marker: "filled" },
  { key: "past_due", label: "Pago vencido", marker: "half" },
  { key: "canceled", label: "Canceladas", marker: "ring" },
];

function LedgerEmpty({ message }: { message: string }) {
  return <p className="type-body-sm py-2 text-text-secondary">{message}</p>;
}

// MRR is the one strong element on the page (plum display figure); everything else in the
// Ledger stays at body weight. No MRR delta: the BE contract has no previous-period value.
function RevenueSection({ subscriptions }: RevenueSectionProps) {
  const { totalSubscribers, byStatus, byPlan, mrrInCents } = subscriptions;
  const hasSubscribers = totalSubscribers > 0;

  return (
    <section
      aria-labelledby="revenue-section-title"
      data-testid="revenue-section"
      className="flex min-w-0 flex-col gap-4"
    >
      <SectionTitle
        id="revenue-section-title"
        title="Ingresos"
        caption="Al día de hoy"
      />

      <div className="flex min-w-0 flex-col gap-8 xl:flex-row xl:gap-16">
        <div className="min-w-0 xl:w-108 xl:shrink" data-testid="mrr-block">
          <p className="type-caption text-text-secondary">MRR mensual</p>
          <p
            className="type-display-strong break-words text-brand-primary tabular-nums"
            data-testid="mrr-value"
          >
            {formatCurrency(mrrInCents)}
          </p>
          <p className="type-body-sm text-text-secondary">
            {formatCount(totalSubscribers)}{" "}
            {totalSubscribers === 1 ? "suscriptora" : "suscriptoras"}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-8 md:flex-row">
          <div
            className="min-w-0 flex-1 md:max-w-68"
            data-testid="breakdown-status"
          >
            <h3 className="type-caption-medium text-text-secondary">
              Por estado
            </h3>
            {hasSubscribers ? (
              <ul>
                {STATUS_ROWS.map((row) => (
                  <BreakdownLedgerRow
                    key={row.key}
                    label={row.label}
                    count={byStatus[row.key]}
                    ratio={toRatio(byStatus[row.key], totalSubscribers)}
                    marker={row.marker}
                    testId={`breakdown-status-${row.key}`}
                  />
                ))}
              </ul>
            ) : (
              <LedgerEmpty message="Todavía no hay suscripciones." />
            )}
          </div>

          <div
            className="min-w-0 flex-1 md:max-w-79"
            data-testid="breakdown-plan"
          >
            <h3 className="type-caption-medium text-text-secondary">
              Por plan
            </h3>
            {hasSubscribers && byPlan.length > 0 ? (
              <ul>
                {byPlan.map((plan) => (
                  <BreakdownLedgerRow
                    key={plan.planId}
                    label={plan.planName}
                    count={plan.count}
                    ratio={toRatio(plan.count, totalSubscribers)}
                    testId={`breakdown-plan-${plan.planId}`}
                  />
                ))}
              </ul>
            ) : (
              <LedgerEmpty message="Todavía no hay suscripciones por plan." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default RevenueSection;
