import { AlertCircle, Users } from "lucide-react";
import { DashboardUserListItemDto } from "@/api/users";
import { useRecentUsers } from "@/Admin/useRecentUsers";
import { formatRelativeDate } from "@/Admin/dashboardFormat";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  type DataTableColumn,
  Skeleton,
} from "@lila-care/design-system";

const RECENT_USERS_LIMIT = 10;

const COLUMNS: DataTableColumn<DashboardUserListItemDto>[] = [
  {
    key: "email",
    header: "Email",
    render: (_value, row) => row.email ?? "Sin email",
  },
  { key: "conversations", header: "Conversaciones", sortable: true },
  { key: "cycleReports", header: "Reportes de ciclo", sortable: true },
  {
    key: "lastActivityAt",
    header: "Última actividad",
    render: (_value, row) => formatRelativeDate(row.lastActivityAt),
  },
];

function RecentUsersSkeleton() {
  return (
    <div className="flex flex-col gap-2" data-testid="recent-users-loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// KAN-53 — first real consumer of `DataTable` (`variant="admin"`, from KAN-46) in this repo.
// `UsersTable.tsx`/`FormsTable.tsx` still build their own table manually with
// `@tanstack/react-table` — that pattern is intentionally not reused here, per the ticket.
function RecentUsersSection() {
  const { data, loading, error, refetch } = useRecentUsers(RECENT_USERS_LIMIT);

  return (
    <section
      aria-labelledby="recent-users-section-title"
      data-testid="recent-users-section"
      className="min-w-0"
    >
      <div className="mb-4">
        <h2
          id="recent-users-section-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Usuarias recientes
        </h2>
      </div>

      {/* `Card` is `flex flex-col` — a flex item's default `min-width: auto` means it won't
          shrink below the table's intrinsic content width, which pushes the whole page wider
          than the viewport on mobile. `min-w-0` on the flex item (`CardContent`) is what lets
          the `overflow-x-auto` wrapper below actually scroll instead of the page overflowing
          (same pattern documented in `agents/memory/lila-web.md` for flex+overflow bugs). */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="sr-only">Usuarias recientes</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {loading && <RecentUsersSkeleton />}

          {!loading && error && (
            <Alert
              variant="destructive"
              className="rounded-xl border-red-200 bg-red-50 p-4"
              aria-live="polite"
              data-testid="recent-users-error"
            >
              <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
              <AlertDescription className="text-red-700">
                <p>Error al cargar las usuarias recientes: {error}</p>
                <Button variant="outline" size="sm" onClick={refetch}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!loading && !error && (
            // `DataTable`'s own wrapper hardcodes `overflow-hidden` (both axes) in the design
            // system — passing `overflow-x-auto` here reaches it via the component's
            // `className` prop (merged with `cn()`/tailwind-merge, which lets a later
            // `overflow-x-*` utility override just the x-axis of an earlier `overflow-hidden`)
            // so a narrow viewport gets a horizontal scrollbar for the table instead of
            // silently clipping the rightmost column.
            <DataTable
              columns={COLUMNS}
              rows={data}
              keyExtractor={(row) => row.userId}
              variant="admin"
              className="overflow-x-auto"
              emptyState={
                <div
                  className="flex flex-col items-center gap-2 py-4"
                  data-testid="recent-users-empty"
                >
                  <Users
                    className="size-8 text-neutral-400"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-neutral-700">
                    Todavía no hay usuarias con actividad reciente.
                  </p>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default RecentUsersSection;
