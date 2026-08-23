import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lila-care/design-system";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlanDto } from "@/api/plans";
import { PlanStatusBadge } from "@/Admin/PlanStatusBadge";

function formatCOP(amountInCents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}

const columns: ColumnDef<PlanDto>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "amountInCents",
    header: "Precio",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCOP(row.original.amountInCents)}
      </span>
    ),
  },
  {
    accessorKey: "intervalDays",
    header: "Intervalo",
    cell: ({ row }) => <span>{row.original.intervalDays} días</span>,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <div className="flex items-center">
        <PlanStatusBadge status={row.original.status} />
      </div>
    ),
  },
];

interface PlansTableProps {
  data: PlanDto[];
  onSelectPlan: (planId: string) => void;
}

export function PlansTable({ data, onSelectPlan }: PlansTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
      <Table aria-label="Tabla de planes">
        <TableHeader className="bg-secondary">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-xs font-semibold uppercase tracking-wide text-neutral-600"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer hover:bg-secondary/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
              onClick={() => onSelectPlan(row.original.planId)}
              tabIndex={0}
              role="button"
              aria-label={`Ver detalle de ${row.original.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectPlan(row.original.planId);
                }
              }}
              data-testid="plan-row"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
