import { formatCount, formatPercent } from "@/Admin/dashboardFormat";
import { LedgerBar } from "@/Admin/ledger/LedgerBar";
import { StatusMarker, type StatusMarkerShape } from "@/Admin/ledger/StatusMarker";

interface BreakdownLedgerRowProps {
  label: string;
  count: number;
  ratio: number;
  marker?: StatusMarkerShape;
  // Tier rows hide the percentage: one profile can be in both tiers, so shares don't add up.
  showPercent?: boolean;
  testId?: string;
}

export function BreakdownLedgerRow({
  label,
  count,
  ratio,
  marker,
  showPercent = true,
  testId,
}: BreakdownLedgerRowProps) {
  return (
    <li className="flex h-8 items-center gap-2" data-testid={testId}>
      {marker && <StatusMarker shape={marker} />}
      <span className="type-body-md min-w-0 flex-1 truncate text-text-primary">
        {label}
      </span>
      <span className="type-body-md w-10 shrink-0 text-right tabular-nums text-text-primary">
        {formatCount(count)}
      </span>
      {showPercent && (
        <span className="type-body-sm w-10 shrink-0 text-right tabular-nums text-text-secondary">
          {formatPercent(ratio)}
        </span>
      )}
      <LedgerBar ratio={ratio} />
    </li>
  );
}
