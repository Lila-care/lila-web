import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  type LucideIcon,
  MessageCircle,
  Repeat,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { useDashboardStats } from "@/Admin/useDashboardStats";
import { RangeSelector } from "@/Admin/RangeSelector";
import { DashboardStatsDto } from "@/api/dashboard";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  KPICard,
  Skeleton,
} from "@lila-care/design-system";

interface KpiCardConfig {
  testId: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  sparklineData?: number[];
}

// The BE stats contract has no period-over-period comparison field yet, so `showDelta` stays
// false for every card — see contract note in the FE report, not something to invent client-side.
// Kept as a plain function (not inline JSX) so the 5 near-identical KPICard configs don't
// duplicate the same prop block 5 times in the render tree.
function buildKpiCards(stats: DashboardStatsDto): KpiCardConfig[] {
  return [
    {
      testId: "kpi-card-new-users",
      label: "Nuevas usuarias",
      value: stats.newUsers.total,
      icon: UserPlus,
      sparklineData: stats.newUsers.byDay.map((d) => d.count),
    },
    {
      testId: "kpi-card-active-users",
      label: "Usuarias activas",
      value: stats.activeUsers.total,
      icon: UserCheck,
      // No `byDay` breakdown for active users in the BE contract — nothing to chart.
    },
    {
      testId: "kpi-card-retention",
      label: "Retención 30d",
      value: `${Math.round(stats.retention.rate * 100)}%`,
      icon: Repeat,
      // No time series for retention in the BE contract.
    },
    {
      testId: "kpi-card-conversations",
      label: "Conversaciones",
      value: stats.conversations.total,
      icon: MessageCircle,
      sparklineData: stats.conversations.byDay.map((d) => d.count),
    },
    {
      testId: "kpi-card-cycle-reports",
      label: "Reportes de ciclo",
      value: stats.cycleReports.total,
      icon: CalendarDays,
      sparklineData: stats.cycleReports.byDay.map((d) => d.count),
    },
  ];
}

function DashboardSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      data-testid="dashboard-loading"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} variant="neo">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-3 h-10 w-full" />
          </CardContent>
        </Card>
      ))}
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
              <div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
                data-testid="kpi-row"
              >
                {buildKpiCards(stats).map((kpi) => (
                  <div key={kpi.testId} data-testid={kpi.testId}>
                    <KPICard
                      label={kpi.label}
                      value={kpi.value}
                      icon={kpi.icon}
                      sparklineData={kpi.sparklineData}
                      showSparkline={!!kpi.sparklineData}
                      showDelta={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default DashboardPage;
