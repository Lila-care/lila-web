import { useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DailyCount } from "@/api/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lila-care/design-system";
import { formatDateLong, formatDateShort } from "@/Admin/dashboardFormat";

interface TrendSeriesConfig {
  key: "newUsers" | "cycleReports" | "conversations";
  label: string;
  color: string;
  byDay: DailyCount[];
}

interface TrendSectionProps {
  days: number;
  newUsers: DailyCount[];
  cycleReports: DailyCount[];
  conversations: DailyCount[];
}

// Indexes a series to day-1 = 100. If the first day (or the whole series) is zero, there is
// no meaningful base to divide by — draw a flat line at 100 rather than Infinity/NaN, which
// matches the design spec's own "all-zero range" behavior (flat lines at the index baseline).
function indexSeries(byDay: DailyCount[]): number[] {
  const base = byDay[0]?.count ?? 0;
  if (base === 0) return byDay.map(() => 100);
  return byDay.map((d) => Math.round((d.count / base) * 100));
}

function buildChartData(series: TrendSeriesConfig[]) {
  const length = series[0]?.byDay.length ?? 0;
  const indexed = series.map((s) => indexSeries(s.byDay));
  return Array.from({ length }, (_, i) => {
    const point: Record<string, number | string> = {
      date: series[0].byDay[i].date,
    };
    series.forEach((s, si) => {
      point[s.key] = indexed[si][i];
      point[`${s.key}Raw`] = s.byDay[i].count;
    });
    return point;
  });
}

function TrendTooltip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: {
    dataKey: string;
    value: number;
    payload: Record<string, number | string>;
  }[];
  series: TrendSeriesConfig[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-neutral-900">
        {formatDateLong(String(point.date))}
      </p>
      {series.map((s) => (
        <p key={s.key} className="flex items-center gap-1.5 text-neutral-600">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: s.color }}
            aria-hidden="true"
          />
          {s.label}: {point[`${s.key}Raw`]} (índice {point[s.key]})
        </p>
      ))}
    </div>
  );
}

export function TrendSection({
  days,
  newUsers,
  cycleReports,
  conversations,
}: TrendSectionProps) {
  const series: TrendSeriesConfig[] = [
    {
      key: "newUsers",
      label: "Usuarias nuevas",
      color: "var(--plum-700)",
      byDay: newUsers,
    },
    {
      key: "cycleReports",
      label: "Reportes de ciclo",
      color: "var(--coral-600)",
      byDay: cycleReports,
    },
    {
      key: "conversations",
      label: "Conversaciones",
      color: "var(--orchid-600)",
      byDay: conversations,
    },
  ];

  const [isolatedKey, setIsolatedKey] = useState<string | null>(null);
  const [tableExpanded, setTableExpanded] = useState(false);
  const firstHeaderRef = useRef<HTMLTableCellElement>(null);

  const chartData = buildChartData(series);
  const lastIndex = chartData.length - 1;

  const toggleTable = () => {
    setTableExpanded((prev) => {
      const next = !prev;
      if (next) {
        // Reorients keyboard/screen-reader users to the newly-revealed table instead of
        // leaving focus on the toggle button with no indication the table appeared below.
        requestAnimationFrame(() => firstHeaderRef.current?.focus());
      }
      return next;
    });
  };

  return (
    <Card className="mt-8" data-testid="trend-section">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-neutral-900">
              Actividad en el tiempo
            </CardTitle>
            <p className="text-sm text-neutral-600">
              Índice — día 1 del período = 100
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTable}
            aria-expanded={tableExpanded}
            data-testid="trend-table-toggle"
          >
            {tableExpanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
            Ver tabla
          </Button>
        </div>

        <div
          className="mt-3 flex flex-wrap gap-3"
          role="group"
          aria-label="Series del gráfico"
        >
          {series.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={isolatedKey === s.key}
              onClick={() =>
                setIsolatedKey((prev) => (prev === s.key ? null : s.key))
              }
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 aria-pressed:border-neutral-400 aria-pressed:bg-neutral-100"
              data-testid={`trend-legend-${s.key}`}
            >
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </button>
          ))}
          {/* Usuarias activas (WAU) is part of the fixed 4-color sequence in the design spec,
              but the BE stats contract only exposes `activeUsers.total` — no `byDay` — so
              there is no daily series to plot. Shown as a disabled legend entry instead of
              silently dropped, so admins (and the next BE iteration) see the gap. */}
          <span
            className="flex items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-400"
            data-testid="trend-legend-active-users-unavailable"
            title="El backend no expone un desglose diario de usuarias activas todavía"
          >
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "var(--forest-700)" }}
              aria-hidden="true"
            />
            Usuarias activas (no disponible por día)
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <figure className="h-72 w-full">
          <figcaption className="sr-only">
            Actividad en el tiempo, últimos {days} días, indexada a 100 el
            primer día
          </figcaption>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 110, left: 0, bottom: 0 }}
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
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                content={<TrendTooltip series={series} />}
                cursor={{
                  stroke: "var(--muted-foreground)",
                  strokeDasharray: "3 3",
                }}
              />
              {series.map((s) => {
                const isDimmed = isolatedKey !== null && isolatedKey !== s.key;
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    strokeOpacity={isDimmed ? 0.12 : 1}
                    dot={false}
                    isAnimationActive={false}
                    label={(props: {
                      x?: string | number;
                      y?: string | number;
                      index?: number;
                    }) => {
                      if (props.index !== lastIndex || isDimmed)
                        return <g key={s.key} />;
                      return (
                        <text
                          key={s.key}
                          x={Number(props.x ?? 0) + 6}
                          y={props.y}
                          dy={4}
                          fontSize={11}
                          fill={s.color}
                        >
                          {s.label}
                        </text>
                      );
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </figure>

        {tableExpanded && (
          <div className="mt-4 overflow-x-auto" data-testid="trend-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead ref={firstHeaderRef} tabIndex={-1}>
                    Fecha
                  </TableHead>
                  {series.map((s) => (
                    <TableHead key={s.key}>{s.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((point) => (
                  <TableRow key={String(point.date)}>
                    <TableCell>{formatDateLong(String(point.date))}</TableCell>
                    {series.map((s) => (
                      <TableCell key={s.key}>{point[`${s.key}Raw`]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
