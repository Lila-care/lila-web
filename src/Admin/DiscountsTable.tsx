import {
  Button,
  DataTable,
  type DataTableColumn,
} from "@lila-care/design-system";
import { DiscountDto } from "@/api/discounts";
import {
  formatDiscountCode,
  formatDiscountValue,
  formatValidityWindow,
} from "@/Admin/plansFormat";

export interface DiscountRow extends DiscountDto {
  planName: string;
}

interface DiscountsTableProps {
  rows: DiscountRow[];
  onEdit: (discountId: string) => void;
  onCreate: () => void;
}

// KAN — Descuentos tab. Same `DataTable` convention as PlansTable.tsx — every column key must
// be a distinct field of `DiscountRow` (extends `DiscountDto`, so `planId`/`kind`/`valueType`/
// `endsAt` stay available to renders even though only one column keys off each of them).
export function DiscountsTable({
  rows,
  onEdit,
  onCreate,
}: DiscountsTableProps) {
  const columns: DataTableColumn<DiscountRow>[] = [
    { key: "planName", header: "Plan", render: (_value, row) => row.planName },
    {
      key: "code",
      header: "Código",
      render: (_value, row) => formatDiscountCode(row),
    },
    {
      key: "value",
      header: "Valor",
      render: (_value, row) => formatDiscountValue(row),
    },
    {
      key: "startsAt",
      header: "Vigencia",
      render: (_value, row) => formatValidityWindow(row.startsAt, row.endsAt),
    },
    {
      key: "status",
      header: "Estado",
      render: (_value, row) =>
        row.status === "active" ? "Activo" : "Inactivo",
    },
    {
      key: "discountId",
      header: "",
      render: (_value, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(row.discountId)}
          data-testid={`discount-edit-${row.discountId}`}
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
      keyExtractor={(row) => row.discountId}
      variant="admin"
      className="overflow-x-auto"
      emptyState={
        <div
          className="flex flex-col items-center gap-3 py-8"
          data-testid="discounts-empty"
        >
          <p className="text-sm font-medium text-neutral-700">
            Todavía no hay descuentos creados.
          </p>
          <Button
            size="sm"
            onClick={onCreate}
            data-testid="discounts-empty-create"
          >
            + Crear descuento
          </Button>
        </div>
      }
    />
  );
}
