import { ReactNode } from "react";
import { KPI_LEDGER_COLUMNS } from "@/Admin/ledger/ledgerColumns";

interface KpiLedgerRowProps {
  label: string;
  total: ReactNode;
  detail: ReactNode;
  trend: ReactNode;
  testId: string;
}

// Same DOM order serves both layouts: below `md` a 2x2 grid (label | total over
// detail | trend — Figma 375 "KPI rows stacked"), from `md` a single 40px ledger line.

export function KpiLedgerRow({
  label,
  total,
  detail,
  trend,
  testId,
}: KpiLedgerRowProps) {
  return (
    <li
      className={`grid ${KPI_LEDGER_COLUMNS} items-center gap-x-2 gap-y-1 border-b border-border-default py-2 md:h-10 md:gap-x-0 md:py-0`}
      data-testid={testId}
    >
      <span className="type-body-md min-w-0 truncate text-text-primary">
        {label}
      </span>
      <span
        className="type-body-lg-strong text-right tabular-nums text-text-primary"
        data-testid={`${testId}-total`}
      >
        {total}
      </span>
      <span className="type-body-sm min-w-0 truncate text-text-secondary md:pl-6">
        {detail}
      </span>
      <span className="flex justify-end md:justify-start">{trend}</span>
    </li>
  );
}
