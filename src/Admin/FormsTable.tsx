import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { LilaForm } from "@/api/forms";
import { FormStatusBadge } from "@/Admin/FormStatusBadge";

const columns: ColumnDef<LilaForm>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "objective",
    header: "Objetivo",
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <div className="flex items-center">
        <FormStatusBadge status={row.original.status} />
      </div>
    ),
  },
  {
    accessorKey: "version",
    header: "Versión",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-neutral-500">
        v{row.original.version}
      </span>
    ),
  },
  {
    accessorKey: "questions",
    header: "Preguntas",
    cell: ({ row }) => <span>{row.original.questions.length}</span>,
  },
];

interface FormsTableProps {
  data: LilaForm[];
  onSelectForm: (formId: string) => void;
}

export function FormsTable({ data, onSelectForm }: FormsTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <Table aria-label="Tabla de forms">
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
              onClick={() => onSelectForm(row.original.formId)}
              tabIndex={0}
              role="button"
              aria-label={`Ver detalle de ${row.original.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectForm(row.original.formId);
                }
              }}
              data-testid="form-row"
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
