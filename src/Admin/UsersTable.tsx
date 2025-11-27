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
  email: string
  cycleReports: number
  energyReports: number
  symptomsReports: number
  total: number
}

export type UserProfileData = {
  profile: {
    id: string;
    userId: string;
    firstReport: string;
    periodDays: number;
    cycleSize: number;
  };
  device: {
    deviceToken: string;
  };
};


export const columns: ColumnDef<UserReport>[] = [
  {
    accessorKey: "id",
    header: "User",
    cell: ({ row }) => <span className="font-medium">{row.original.id}</span>,
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

export function UsersTable({ data, onSelectUser }: { data: UserReport[]; onSelectUser?: (id: string) => void }) {
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
                  className="text-gray-700! font-semibold"
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
              <TableRow key={row.id} className="hover:bg-gray-50 text-text">
                {row.getVisibleCells().map(cell => (
                  <TableCell 
                  key={cell.id}
                  onClick={() => onSelectUser && onSelectUser(row.original.id)}
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
