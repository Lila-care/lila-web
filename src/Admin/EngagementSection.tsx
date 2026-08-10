import { Line, LineChart, ResponsiveContainer } from "recharts";
import { CalendarDays, MessageCircle, UserCheck } from "lucide-react";
import { DailyCount } from "@/api/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeTrend } from "@/Admin/dashboardFormat";

interface SparklineProps {
  data: DailyCount[];
  color: string;
}

// De-emphasizes the historic segment (reduced opacity) and highlights only the current
// (last) point in full color — per the design spec's mark spec for sparklines.
function Sparkline({ data, color }: SparklineProps) {
  const lastIndex = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeOpacity={0.45}
          strokeWidth={2}
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; index?: number }) => {
            if (props.index !== lastIndex) return <g key={props.index} />;
            return (
              <circle
                key="current"
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill={color}
                stroke="var(--card)"
                strokeWidth={2}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface StatCardWithSparklineProps {
  icon: typeof UserCheck;
  label: string;
  value: number;
  color: string;
  byDay?: DailyCount[];
  testId: string;
}

function StatCardWithSparkline({
  icon: Icon,
  label,
  value,
  color,
  byDay,
  testId,
}: StatCardWithSparklineProps) {
  const ariaLabel = byDay
    ? `${label}: ${value} en total, ${describeTrend(byDay)}.`
    : `${label}: ${value} en total.`;

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-600">
          {label}
        </CardTitle>
        <Icon className="size-4 text-neutral-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <figure className="mt-2 h-8 w-full" role="img" aria-label={ariaLabel}>
          <figcaption className="sr-only">
            {label} — tendencia diaria
          </figcaption>
          {byDay ? (
            <Sparkline data={byDay} color={color} />
          ) : (
            // The BE stats contract only exposes a running total for active users, no
            // `byDay` breakdown — nothing to chart. Documented in the FE report as a
            // BE-contract gap rather than fabricated data.
            <div className="flex h-full items-center text-xs text-neutral-400">
              Sin datos diarios disponibles
            </div>
          )}
        </figure>
      </CardContent>
    </Card>
  );
}

interface EngagementSectionProps {
  days: number;
  activeUsersTotal: number;
  cycleReports: { total: number; byDay: DailyCount[] };
  conversations: { total: number; byDay: DailyCount[] };
}

export function EngagementSection({
  days,
  activeUsersTotal,
  cycleReports,
  conversations,
}: EngagementSectionProps) {
  return (
    <section className="mt-8" aria-labelledby="engagement-heading">
      <h2
        id="engagement-heading"
        className="mb-3 text-base font-semibold text-neutral-900"
      >
        Engagement
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardWithSparkline
          icon={UserCheck}
          label={`Usuarias activas · últimos ${days} días`}
          value={activeUsersTotal}
          color="var(--forest-700)"
          testId="stat-active-users"
        />
        <StatCardWithSparkline
          icon={CalendarDays}
          label="Reportes de ciclo registrados"
          value={cycleReports.total}
          color="var(--coral-600)"
          byDay={cycleReports.byDay}
          testId="stat-cycle-reports"
        />
        <StatCardWithSparkline
          icon={MessageCircle}
          label="Conversaciones con Lila"
          value={conversations.total}
          color="var(--orchid-600)"
          byDay={conversations.byDay}
          testId="stat-conversations"
        />
      </div>
    </section>
  );
}
