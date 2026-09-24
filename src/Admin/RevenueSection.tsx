import { CircleDollarSign } from "lucide-react";
import { SubscriptionStatsDto } from "@/api/dashboard";
import { formatCurrency } from "@/Admin/dashboardFormat";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryBreakdown,
  KPICard,
} from "@lila-care/design-system";

interface RevenueSectionProps {
  subscriptions: SubscriptionStatsDto;
}

// KPI-49 — the BE contract has no previous-period MRR to compare against (see
// `SubscriptionStatsDto`, no `deltaInCents`/similar field), so `showDelta` stays false, same
// criterion already applied to the 5 KPICards in `DashboardPage.tsx` (KAN-47).
function RevenueSection({ subscriptions }: RevenueSectionProps) {
  const { totalSubscribers, byStatus, byPlan, mrrInCents } = subscriptions;
  const hasSubscribers = totalSubscribers > 0;

  const statusCategories = [
    { label: "Activas", value: byStatus.active },
    { label: "Pago vencido", value: byStatus.past_due },
    { label: "Canceladas", value: byStatus.canceled },
  ];
  const planCategories = byPlan.map((plan) => ({
    label: plan.planName,
    value: plan.count,
  }));

  return (
    <section
      aria-labelledby="revenue-section-title"
      data-testid="revenue-section"
      className="min-w-0"
    >
      <div className="mb-4 flex items-baseline gap-3">
        <h2
          id="revenue-section-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Ingresos
        </h2>
        <span className="text-xs font-semibold uppercase tracking-wide text-[--brand-primary]">
          Nuevo en este dashboard
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div data-testid="kpi-card-mrr">
          <KPICard
            label="MRR"
            value={formatCurrency(mrrInCents)}
            icon={CircleDollarSign}
            showDelta={false}
          />
        </div>

        <Card className="min-w-0" data-testid="category-breakdown-status">
          <CardHeader>
            <CardTitle>Por estado</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {hasSubscribers ? (
              <CategoryBreakdown categories={statusCategories} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay suscripciones activas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0" data-testid="category-breakdown-plan">
          <CardHeader>
            <CardTitle>Por plan</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            {hasSubscribers && planCategories.length > 0 ? (
              <CategoryBreakdown categories={planCategories} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no hay suscripciones por plan.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default RevenueSection;
