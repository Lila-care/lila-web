import {
  Button,
  DataTable,
  type DataTableColumn,
} from "@lila-care/design-system";
import { formatCurrency } from "@/Admin/dashboardFormat";
import {
  formatBillingCycle,
  formatDailyLimit,
  formatPlanStatus,
} from "@/Admin/plansFormat";
import { PlanRow } from "@/Admin/usePlans";

interface PriceCellProps {
  row: PlanRow;
}

// A plan with an active `static` discount shows the original price struck through above the
// promo price — `custom` (code) discounts never reach this cell, see resolvePlanPromo.
function PriceCell({ row }: PriceCellProps) {
  if (!row.promo) {
    return <span>{formatCurrency(row.amountInCents)}</span>;
  }
  return (
    <span
      className="flex flex-col"
      data-testid={`plan-price-promo-${row.planId}`}
    >
      <span className="text-xs text-neutral-400 line-through">
        {formatCurrency(row.promo.originalAmountInCents)}
      </span>
      <span className="font-medium">
        {formatCurrency(row.promo.finalAmountInCents)}
      </span>
    </span>
  );
}

interface PlansTableProps {
  rows: PlanRow[];
  onEdit: (planId: string) => void;
  onCreate: () => void;
}

// KAN — Planes tab. `DataTable` (`variant="admin"`) per CLAUDE.md convention (first consumer:
// RecentUsersSection.tsx); each column key must be a distinct field of `PlanRow` (the design
// system reuses `String(column.key)` as the React key for both header and body cells, so two
// columns can't share the same key even when one of them is a synthetic "actions" column).
export function PlansTable({ rows, onEdit, onCreate }: PlansTableProps) {
  const columns: DataTableColumn<PlanRow>[] = [
    { key: "name", header: "Plan", render: (_value, row) => row.name },
    {
      key: "amountInCents",
      header: "Precio",
      render: (_value, row) => <PriceCell row={row} />,
    },
    {
      key: "intervalDays",
      header: "Ciclo",
      render: (_value, row) => formatBillingCycle(row.intervalDays),
    },
    {
      key: "maxInteractionsPerDay",
      header: "Límite diario",
      render: (_value, row) => formatDailyLimit(row.maxInteractionsPerDay),
    },
    {
      key: "status",
      header: "Estado",
      render: (_value, row) => formatPlanStatus(row.status),
    },
    {
      key: "planId",
      header: "",
      render: (_value, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(row.planId)}
          data-testid={`plan-edit-${row.planId}`}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyExtractor={(row) => row.planId}
      variant="admin"
      className="overflow-x-auto"
      emptyState={
        <div
          className="flex flex-col items-center gap-3 py-8"
          data-testid="plans-empty"
        >
          <p className="text-sm font-medium text-neutral-700">
            Todavía no hay planes creados.
          </p>
          <Button size="sm" onClick={onCreate} data-testid="plans-empty-create">
            + Crear plan
          </Button>
        </div>
      }
    />
  );
}
