import { Line, LineChart, YAxis, type DotItemDotProps } from "recharts";
import { DailyCount } from "@/api/dashboard";
import { describeTrend } from "@/Admin/dashboardFormat";

const WIDTH = 160;
const HEIGHT = 24;
// Keeps the end dot (r=2) and the 1.5px stroke from being clipped at the SVG edge.
const CHART_MARGIN = { top: 3, right: 3, bottom: 3, left: 3 };

interface SparklineProps {
  label: string;
  byDay: DailyCount[];
}

// Floor of 1 so an all-zero range draws a flat baseline instead of recharts centering a
// zero-height domain.
function yDomainMax(dataMax: number): number {
  return Math.max(dataMax, 1);
}

export function Sparkline({ label, byDay }: SparklineProps) {
  const lastIndex = byDay.length - 1;

  // Only the last point gets a dot — the Ledger spec has no per-point markers or tooltip.
  const renderEndDot = ({ cx, cy, index }: DotItemDotProps) =>
    index === lastIndex && cx != null && cy != null ? (
      <circle
        key="end-dot"
        cx={cx}
        cy={cy}
        r={2}
        className="fill-teal-700"
      />
    ) : null;

  return (
    <div
      role="img"
      aria-label={`${label}: ${describeTrend(byDay)}`}
      className="shrink-0"
      data-testid="sparkline"
    >
      <LineChart
        width={WIDTH}
        height={HEIGHT}
        data={byDay}
        margin={CHART_MARGIN}
        accessibilityLayer={false}
      >
        <YAxis hide domain={[0, yDomainMax]} />
        <Line
          type="linear"
          dataKey="count"
          stroke="var(--text-secondary)"
          strokeWidth={1.5}
          dot={renderEndDot}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
