import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

export type UserReport = {
  id: string
  name: string
  email: string
  cycleReports: number
  energyReports: number
  symptomsReports: number
  total: number
}

export const columns: ColumnDef<UserReport>[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "cycleReports",
    header: "Cycle",
  },
  {
    accessorKey: "energyReports",
    header: "Energy",
  },
  {
    accessorKey: "symptomsReports",
    header: "Symptoms",
  },
  {
    accessorKey: "total",
    header: "Total",
  },
]

export function UsersTable({ data }: { data: UserReport[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm">
      <Table>
        <TableHeader className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className="text-gray-700 font-semibold"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="text-gray-600">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-gray-500"
              >
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
