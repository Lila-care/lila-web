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
import { DashboardUserListItemDto } from "@/api/users";
import { formatDateLong } from "@/Admin/dashboardFormat";

export const columns: ColumnDef<DashboardUserListItemDto>[] = [
  {
    accessorKey: "userId",
    header: "Usuaria",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.userId}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email ?? "—",
  },
  {
    accessorKey: "cycleReports",
    header: "Reportes de ciclo",
  },
  {
    accessorKey: "conversations",
    header: "Conversaciones",
  },
  {
    accessorKey: "lastActivityAt",
    header: "Última actividad",
    cell: ({ row }) =>
      row.original.lastActivityAt
        ? formatDateLong(row.original.lastActivityAt)
        : "Nunca",
  },
];

interface UsersTableProps {
  data: DashboardUserListItemDto[];
  onSelectUser?: (userId: string) => void;
}

export function UsersTable({ data, onSelectUser }: UsersTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className="rounded-lg border border-gray-200 shadow-sm"
      data-testid="users-table"
    >
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
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-gray-50 text-text"
                data-testid="user-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    onClick={() => onSelectUser?.(row.original.userId)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-gray-800!"
                data-testid="users-table-empty"
              >
                No hay usuarias todavía.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
