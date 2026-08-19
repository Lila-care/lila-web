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
    cell: ({ row }) => <FormStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "version",
    header: "Versión",
    cell: ({ row }) => <span>v{row.original.version}</span>,
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
    <div className="rounded-lg border border-gray-200 shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="text-gray-700! font-semibold"
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
              className="hover:bg-gray-50 text-text cursor-pointer"
              onClick={() => onSelectForm(row.original.formId)}
              data-testid="form-row"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
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
