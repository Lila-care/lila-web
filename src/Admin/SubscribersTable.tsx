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
import { SubscriberListItem } from "@/api/subscribers";
import { SubscriptionStatus } from "@/api/subscription";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  none: "Sin suscripción",
  active: "Activa",
  past_due: "Vencida",
  canceled: "Cancelada",
};

const STATUS_VARIANT: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  none: "outline",
  active: "default",
  past_due: "destructive",
  canceled: "secondary",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

const columns: ColumnDef<SubscriberListItem>[] = [
  {
    accessorKey: "userId",
    header: "Usuaria",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">
          {row.original.email ?? row.original.userId}
        </p>
        {row.original.email && (
          <p className="truncate text-xs text-neutral-500">
            {row.original.userId}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "planName",
    header: "Plan",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <Badge
        variant={STATUS_VARIANT[row.original.status]}
        data-testid="subscriber-status-badge"
      >
        {STATUS_LABEL[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "currentPeriodEnd",
    header: "Próximo cobro",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatDate(row.original.currentPeriodEnd)}
      </span>
    ),
  },
];

interface SubscribersTableProps {
  data: SubscriberListItem[];
}

export function SubscribersTable({ data }: SubscribersTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
      <Table aria-label="Tabla de suscriptoras">
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
            <TableRow key={row.id} data-testid="subscriber-row">
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
