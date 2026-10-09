import { Link } from "wouter";
import { formatCount, formatPercent } from "@/Admin/dashboardFormat";
import { LedgerBar } from "@/Admin/ledger/LedgerBar";
import { FUNNEL_COLUMNS } from "@/Admin/ledger/ledgerColumns";

interface FunnelRowProps {
  label: string;
  count: number;
  // Share of the previous step (0..1); null for the first step, which has no predecessor.
  ratio: number | null;
  href: string;
  testId: string;
}

// Figma FunnelRow (886:2157): 36px line, label | count | "% del paso anterior" | bar | chevron.
// Hover paints the surface and reveals the chevron. The whole row is one link; text colors sit
// on the inner spans (index.css has an unlayered `a:hover { color }`).
export function FunnelRow({
  label,
  count,
  ratio,
  href,
  testId,
}: FunnelRowProps) {
  return (
    <li className="border-b border-border-default" data-testid={testId}>
      <Link
        href={href}
        className={`group grid ${FUNNEL_COLUMNS} h-9 items-center gap-x-3 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-700`}
      >
        <span className="type-body-md min-w-0 truncate text-text-primary">
          {label}
        </span>
        <span
          className="type-body-md text-right tabular-nums text-text-primary"
          data-testid={`${testId}-count`}
        >
          {formatCount(count)}
        </span>
        <span className="type-body-sm text-right tabular-nums text-text-secondary">
          {ratio === null ? "—" : formatPercent(ratio)}
        </span>
        <LedgerBar ratio={ratio ?? 1} className="w-25" />
        <span
          className="text-base leading-6 text-text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          ›
        </span>
      </Link>
    </li>
  );
}
