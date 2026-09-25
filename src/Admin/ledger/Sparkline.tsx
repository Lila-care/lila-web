import {
  Line,
  LineChart,
  ResponsiveContainer,
  YAxis,
  type DotItemDotProps,
} from "recharts";
import { DailyCount } from "@/api/dashboard";
import { describeTrend } from "@/Admin/dashboardFormat";

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

  // 96x20 in the stacked KPI row (<xl), 160x24 in the desktop ledger line (Figma).
  return (
    <div
      role="img"
      aria-label={`${label}: ${describeTrend(byDay)}`}
      className="h-5 w-24 shrink-0 xl:h-6 xl:w-40"
      data-testid="sparkline"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
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
      </ResponsiveContainer>
    </div>
  );
}
