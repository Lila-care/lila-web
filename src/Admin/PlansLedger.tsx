import { formatCurrency } from "@/Admin/dashboardFormat";
import {
  describePromo,
  formatBillingCycle,
  formatDailyLimit,
  formatPlanStatus,
  summarizePlan,
} from "@/Admin/plansFormat";
import { PlanRow } from "@/Admin/usePlans";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { PLANS_LEDGER_COLUMNS } from "@/Admin/ledger/ledgerColumns";
import {
  LedgerStatusText,
  ResponsiveLedgerRow,
} from "@/Admin/ledger/ResponsiveLedgerRow";
import { TextButton } from "@/Admin/ledger/LedgerButton";

// An active `static` discount strikes the original price above the promo price, with the
// discount itself underneath — `custom` (code) discounts never reach here, see resolvePlanPromo.
function PriceCell({ row }: { row: PlanRow }) {
  if (!row.promo) {
    return (
      <span className="type-body-md text-text-primary">
        {formatCurrency(row.amountInCents)}
      </span>
    );
  }
  return (
    <span
      className="flex min-w-0 flex-col gap-0.5"
      data-testid={`plan-price-promo-${row.planId}`}
    >
      <span className="type-body-sm text-text-secondary line-through">
        {formatCurrency(row.promo.originalAmountInCents)}
      </span>
      <span className="type-body-md text-text-primary">
        {formatCurrency(row.promo.finalAmountInCents)}
      </span>
      <span className="type-body-sm text-text-secondary">
        {describePromo(row.promo)}
      </span>
    </span>
  );
}

function PlanStatus({ row }: { row: PlanRow }) {
  return (
    <LedgerStatusText tone={row.status === "active" ? "accent" : "muted"}>
      {formatPlanStatus(row.status)}
    </LedgerStatusText>
  );
}

interface PlansLedgerProps {
  rows: PlanRow[];
  onEdit: (planId: string) => void;
}

export function PlansLedger({ rows, onEdit }: PlansLedgerProps) {
  return (
    <div className="min-w-0">
      <LedgerHeader
        className={`hidden gap-x-4 lg:grid ${PLANS_LEDGER_COLUMNS}`}
      >
        <span>Plan</span>
        <span>Precio</span>
        <span>Ciclo</span>
        <span>Límite diario</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </LedgerHeader>
      <ul className="flex flex-col gap-3 lg:gap-0">
        {rows.map((row) => (
          <ResponsiveLedgerRow
            key={row.planId}
            testId={`plan-row-${row.planId}`}
            columnsClass={PLANS_LEDGER_COLUMNS}
            alignTop={row.promo !== null}
            onOpen={() => onEdit(row.planId)}
            stacked={{
              title: row.name,
              status: <PlanStatus row={row} />,
              summary: summarizePlan(row, row.promo),
            }}
            cells={
              <>
                <span className="type-body-md min-w-0 break-words text-text-primary">
                  {row.name}
                </span>
                <PriceCell row={row} />
                <span className="type-body-sm text-text-secondary">
                  {formatBillingCycle(row.intervalDays)}
                </span>
                <span className="type-body-sm text-text-secondary">
                  {formatDailyLimit(row.maxInteractionsPerDay)}
                </span>
                <PlanStatus row={row} />
                <span className="text-right">
                  <TextButton
                    onClick={() => onEdit(row.planId)}
                    aria-label={`Editar plan ${row.name}`}
                    data-testid={`plan-edit-${row.planId}`}
                  >
                    Editar
                  </TextButton>
                </span>
              </>
            }
          />
        ))}
      </ul>
    </div>
  );
}
