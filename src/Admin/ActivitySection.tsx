import { ReactNode } from "react";
import { DailyCount, DashboardStatsDto } from "@/api/dashboard";
import {
  describePeak,
  formatCount,
  formatPercent,
} from "@/Admin/dashboardFormat";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { KpiLedgerRow } from "@/Admin/ledger/KpiLedgerRow";
import { KPI_LEDGER_COLUMNS } from "@/Admin/ledger/ledgerColumns";
import { Sparkline } from "@/Admin/ledger/Sparkline";
import { MissingValue } from "@/Admin/ledger/MissingValue";

interface ActivitySectionProps {
  stats: DashboardStatsDto;
}

interface ActivityRow {
  testId: string;
  label: string;
  total: ReactNode;
  detail: ReactNode;
  trend: ReactNode;
}

function seriesRow(
  testId: string,
  label: string,
  series: { total: number; byDay: DailyCount[] },
): ActivityRow {
  return {
    testId,
    label,
    total: formatCount(series.total),
    detail: describePeak(series.byDay),
    trend: <Sparkline label={label} byDay={series.byDay} />,
  };
}

// Retention is undefined (not 0 %) when nobody signed up in the range — show the Figma
// missing-value dash instead of a misleading "0 %".
function retentionRow(retention: DashboardStatsDto["retention"]): ActivityRow {
  const hasCohort = retention.newUsersInRange > 0;
  return {
    testId: "kpi-row-retention",
    label: "Retención",
    total: hasCohort ? formatPercent(retention.rate) : <MissingValue />,
    detail: hasCohort
      ? `${formatCount(retention.returned)} de ${formatCount(retention.newUsersInRange)} nuevas volvieron`
      : "Sin nuevas usuarias en el periodo",
    trend: <MissingValue />,
  };
}

// No ▲▼ deltas on purpose: the BE stats contract has no previous-period comparison.
function buildActivityRows(stats: DashboardStatsDto): ActivityRow[] {
  return [
    seriesRow("kpi-row-new-users", "Nuevas usuarias", stats.newUsers),
    {
      testId: "kpi-row-active-users",
      label: "Usuarias activas",
      total: formatCount(stats.activeUsers.total),
      detail: "Escribieron o registraron ciclo",
      // The BE has no `byDay` for active users — nothing to chart.
      trend: <MissingValue />,
    },
    retentionRow(stats.retention),
    seriesRow(
      "kpi-row-conversations",
      "Conversaciones con Lila",
      stats.conversations,
    ),
    seriesRow("kpi-row-cycle-reports", "Reportes de ciclo", stats.cycleReports),
  ];
}

function hasNoActivity(stats: DashboardStatsDto): boolean {
  return (
    stats.newUsers.total === 0 &&
    stats.activeUsers.total === 0 &&
    stats.cycleReports.total === 0 &&
    stats.conversations.total === 0
  );
}

function ActivitySection({ stats }: ActivitySectionProps) {
  return (
    <section
      aria-labelledby="activity-section-title"
      data-testid="activity-section"
      className="flex min-w-0 flex-col gap-2"
    >
      <SectionTitle id="activity-section-title" title="Actividad" />
      <div className="min-w-0">
        <LedgerHeader
          className={`hidden xl:grid ${KPI_LEDGER_COLUMNS}`}
        >
          <span>Indicador</span>
          <span className="text-right">Total</span>
          <span className="pl-6">Detalle</span>
          <span>Últimos {stats.range.days} días</span>
        </LedgerHeader>
        <ul>
          {buildActivityRows(stats).map((row) => (
            <KpiLedgerRow key={row.testId} {...row} />
          ))}
        </ul>
      </div>
      {hasNoActivity(stats) && (
        <p
          className="type-body-sm text-text-secondary"
          data-testid="activity-empty"
        >
          Todavía no hay actividad en los últimos {stats.range.days} días.
          Cuando las usuarias empiecen a usar Lila, vas a ver las métricas acá.
        </p>
      )}
    </section>
  );
}

export default ActivitySection;
