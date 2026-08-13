import { AlertCircle } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useDashboardStats } from "@/Admin/useDashboardStats";
import { RangeSelector } from "@/Admin/RangeSelector";
import { formatDateLong } from "@/Admin/dashboardFormat";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ReportsPage() {
  const {
    stats,
    days,
    setDays,
    isInitialLoading,
    isRefetching,
    error,
    refetch,
  } = useDashboardStats();

  return (
    <AdminLayout>
      <div
        className="min-h-full bg-neutral-50 px-10 py-8"
        data-testid="reports-page"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Reportes
              </h1>
              <p className="text-sm text-neutral-600">
                Desglose diario de actividad de Lila
              </p>
            </div>
            <RangeSelector
              value={days}
              onChange={setDays}
              disabled={isInitialLoading}
              loading={isRefetching}
            />
          </div>

          {isInitialLoading && (
            <div className="space-y-2" data-testid="reports-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!isInitialLoading && error && (
            <Alert
              variant="destructive"
              className="rounded-xl border-red-200 bg-red-50 p-4"
              aria-live="polite"
              data-testid="reports-error"
            >
              <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
              <AlertDescription className="text-red-700">
                <p>Error al cargar los reportes: {error}</p>
                <Button variant="outline" size="sm" onClick={refetch}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isInitialLoading && !error && stats && (
            <div
              className={
                isRefetching
                  ? "pointer-events-none rounded-xl border border-neutral-200 bg-white opacity-50 shadow-sm transition-opacity"
                  : "rounded-xl border border-neutral-200 bg-white shadow-sm transition-opacity"
              }
              data-testid="reports-content"
            >
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuarias nuevas</TableHead>
                      <TableHead>Reportes de ciclo</TableHead>
                      <TableHead>Conversaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.newUsers.byDay.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-neutral-500"
                          data-testid="reports-empty"
                        >
                          Sin datos en este rango.
                        </TableCell>
                      </TableRow>
                    )}
                    {stats.newUsers.byDay.map((day, i) => (
                      <TableRow key={day.date} data-testid="report-row">
                        <TableCell>{formatDateLong(day.date)}</TableCell>
                        <TableCell>{day.count}</TableCell>
                        <TableCell>
                          {stats.cycleReports.byDay[i]?.count ?? 0}
                        </TableCell>
                        <TableCell>
                          {stats.conversations.byDay[i]?.count ?? 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ReportsPage;
