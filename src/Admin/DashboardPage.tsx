import { useEffect, useRef, useState } from "react";
import { AlertCircle, Users } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useDashboardStats } from "@/Admin/useDashboardStats";
import { RangeSelector } from "@/Admin/RangeSelector";
import { NewUsersHeroCard } from "@/Admin/NewUsersHeroCard";
import { RetentionCard } from "@/Admin/RetentionCard";
import { EngagementSection } from "@/Admin/EngagementSection";
import { TrendSection } from "@/Admin/TrendSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-loading">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="mt-4 h-48 w-full" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="mt-3 h-8 w-16" />
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="mt-8 h-72 w-full rounded-xl" />
    </div>
  );
}

function DashboardPage() {
  const {
    stats,
    days,
    setDays,
    isInitialLoading,
    isRefetching,
    error,
    refetch,
  } = useDashboardStats();
  const [announcement, setAnnouncement] = useState("");
  const hasLoadedOnceRef = useRef(false);

  // Announce only on a range-change refetch, never on the very first mount (that would be
  // redundant noise for screen reader users who just landed on the page).
  useEffect(() => {
    if (!stats) return;
    if (hasLoadedOnceRef.current) {
      setAnnouncement(
        `Mostrando datos de los últimos ${stats.range.days} días.`,
      );
    }
    hasLoadedOnceRef.current = true;
  }, [stats]);

  const isFullyEmpty =
    !!stats &&
    stats.newUsers.total === 0 &&
    stats.activeUsers.total === 0 &&
    stats.cycleReports.total === 0 &&
    stats.conversations.total === 0;

  return (
    <AdminLayout>
      <div
        className="min-h-full bg-neutral-50 px-10 py-8"
        data-testid="dashboard-page"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Dashboard
              </h1>
              <p className="text-sm text-neutral-600">
                Resumen de actividad de Lila
              </p>
            </div>
            <RangeSelector
              value={days}
              onChange={setDays}
              disabled={isInitialLoading}
              loading={isRefetching}
            />
          </div>

          <div
            aria-live="polite"
            className="sr-only"
            data-testid="dashboard-live-region"
          >
            {announcement}
          </div>

          {isInitialLoading && <DashboardSkeleton />}

          {!isInitialLoading && error && (
            <Alert
              variant="destructive"
              className="rounded-xl border-red-200 bg-red-50 p-4"
              aria-live="polite"
              data-testid="dashboard-error"
            >
              <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
              <AlertDescription className="text-red-700">
                <p>Error al cargar el dashboard: {error}</p>
                <Button variant="outline" size="sm" onClick={refetch}>
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isInitialLoading && !error && isFullyEmpty && (
            <div
              className="rounded-xl border border-dashed border-neutral-300 bg-secondary py-16 text-center"
              data-testid="dashboard-empty"
            >
              <Users
                className="mx-auto mb-3 size-12 text-neutral-400"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-neutral-700">
                Todavía no hay datos de actividad.
              </p>
              <p className="text-sm text-neutral-500">
                Cuando las usuarias empiecen a registrarse, vas a ver las
                métricas acá.
              </p>
            </div>
          )}

          {!isInitialLoading && !error && stats && !isFullyEmpty && (
            <div
              className={
                isRefetching
                  ? "pointer-events-none opacity-50 transition-opacity"
                  : "transition-opacity"
              }
              data-testid="dashboard-content"
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <NewUsersHeroCard
                    total={stats.newUsers.total}
                    byDay={stats.newUsers.byDay}
                    days={stats.range.days}
                  />
                </div>
                <div className="lg:col-span-4">
                  <RetentionCard
                    newUsersInRange={stats.retention.newUsersInRange}
                    returned={stats.retention.returned}
                    rate={stats.retention.rate}
                  />
                </div>
              </div>

              <EngagementSection
                days={stats.range.days}
                activeUsersTotal={stats.activeUsers.total}
                cycleReports={stats.cycleReports}
                conversations={stats.conversations}
              />

              <TrendSection
                days={stats.range.days}
                newUsers={stats.newUsers.byDay}
                cycleReports={stats.cycleReports.byDay}
                conversations={stats.conversations.byDay}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default DashboardPage;
