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
import { Link } from "wouter";
import type { LearnArticle } from "@/api/learn";
import { ContentStatusBadge } from "@/Admin/ContentStatusBadge";
import { formatDateTime, phaseLabel } from "@/Admin/contentLabels";

const columns: ColumnDef<LearnArticle>[] = [
  {
    accessorKey: "title",
    header: "Título",
    cell: ({ row }) => (
      <Link
        href={`/admin/content/${row.original.articleId}`}
        className="block min-w-[200px] max-w-[360px]"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="block font-medium text-gray-900 whitespace-normal">
          {row.original.title || "Sin título"}
        </span>
        <span className="block truncate text-xs text-gray-500">
          {row.original.slug}
        </span>
      </Link>
    ),
  },
  {
    accessorKey: "phase",
    header: "Fase",
    cell: ({ row }) => phaseLabel(row.original.phase),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <ContentStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "version",
    header: "Versión",
    cell: ({ row }) => <span>v{row.original.version}</span>,
  },
  {
    id: "published",
    header: "En la app",
    cell: ({ row }) => {
      const { published, archivedAt } = row.original;
      if (!published) return <span className="text-gray-400">—</span>;
      return (
        <span
          className={
            archivedAt ? "text-gray-400 line-through" : "text-green-700"
          }
          data-testid="article-published-version"
        >
          Publicada v{published.version}
        </span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Actualizado",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-gray-600">
        {formatDateTime(row.original.updatedAt)}
      </span>
    ),
  },
];

interface ContentArticlesTableProps {
  data: LearnArticle[];
  onSelectArticle: (articleId: string) => void;
}

export function ContentArticlesTable({
  data,
  onSelectArticle,
}: ContentArticlesTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-[12px] border border-gray-200 bg-white">
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
              className="cursor-pointer text-text hover:bg-gray-50"
              onClick={() => onSelectArticle(row.original.articleId)}
              data-testid="content-article-row"
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
