import {
  Button,
  DataTable,
  type DataTableColumn,
} from "@lila-care/design-system";
import { SubscriberListItemDto } from "@/api/subscribers";
import { formatDateShort } from "@/Admin/dashboardFormat";
import {
  formatSubscriberSource,
  formatSubscriberStatus,
} from "@/Admin/plansFormat";

interface SubscribersTableProps {
  rows: SubscriberListItemDto[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

// KAN — Suscriptoras tab, read-only: no "Editar" column, no create action. Cursor pagination
// surfaces as a "Cargar más" button below the table instead of numbered pages (the BE contract
// only exposes a cursor, no total count/page size).
export function SubscribersTable({
  rows,
  hasMore,
  loadingMore,
  onLoadMore,
}: SubscribersTableProps) {
  const columns: DataTableColumn<SubscriberListItemDto>[] = [
    {
      key: "email",
      header: "Email",
      render: (_value, row) => row.email ?? "Sin email",
    },
    { key: "planName", header: "Plan", render: (_value, row) => row.planName },
    {
      key: "status",
      header: "Estado",
      render: (_value, row) => formatSubscriberStatus(row.status),
    },
    {
      key: "currentPeriodEnd",
      header: "Vence",
      render: (_value, row) =>
        row.currentPeriodEnd ? formatDateShort(row.currentPeriodEnd) : "—",
    },
    {
      key: "source",
      header: "Origen",
      render: (_value, row) => formatSubscriberSource(row.source),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(row) => row.userId}
        variant="admin"
        className="overflow-x-auto"
        emptyState={
          <div
            className="flex flex-col items-center gap-2 py-8"
            data-testid="subscribers-empty"
          >
            <p className="text-sm font-medium text-neutral-700">
              Todavía no hay suscriptoras.
            </p>
          </div>
        }
      />

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            data-testid="subscribers-load-more"
          >
            {loadingMore ? "Cargando..." : "Cargar más"}
          </Button>
        </div>
      )}
    </div>
  );
}
