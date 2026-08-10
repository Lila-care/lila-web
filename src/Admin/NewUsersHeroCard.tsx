import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { UserPlus } from "lucide-react";
import { DailyCount } from "@/api/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  describeTrend,
  formatDateLong,
  formatDateShort,
} from "@/Admin/dashboardFormat";

interface NewUsersHeroCardProps {
  total: number;
  byDay: DailyCount[];
  days: number;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DailyCount }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-neutral-900">
        {formatDateLong(point.date)}
      </p>
      <p className="text-neutral-600">{point.count} usuarias nuevas</p>
    </div>
  );
}

export function NewUsersHeroCard({
  total,
  byDay,
  days,
}: NewUsersHeroCardProps) {
  const isEmpty = total === 0;
  const ariaLabel = isEmpty
    ? `Usuarias nuevas por día, sin registros en los últimos ${days} días.`
    : `Usuarias nuevas por día, ${describeTrend(byDay)}, ${total} en total en los últimos ${days} días.`;

  return (
    <Card data-testid="new-users-hero-card">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <UserPlus className="size-5 text-primary" aria-hidden="true" />
        <CardTitle className="text-sm font-medium text-neutral-600">
          Usuarias nuevas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className="text-4xl font-semibold text-neutral-900"
          data-testid="new-users-total"
        >
          {total}
        </p>

        <figure className="mt-4 h-48 w-full">
          <figcaption className="sr-only">Usuarias nuevas por día</figcaption>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byDay}
              margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
              barCategoryGap={2}
              role="img"
              aria-label={ariaLabel}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--plum-100)" }}
              />
              <Bar
                dataKey="count"
                fill="var(--plum-700)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </figure>

        {isEmpty && (
          <p
            className="-mt-6 text-center text-sm text-neutral-500"
            data-testid="new-users-empty-caption"
          >
            Sin registros en este rango
          </p>
        )}

        <p className="mt-2 text-sm text-neutral-600">
          {total} usuarias nuevas en los últimos {days} días
        </p>
      </CardContent>
    </Card>
  );
}
