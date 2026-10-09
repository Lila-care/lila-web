import { ReactNode } from "react";
import { Link } from "wouter";
import { KPI_LEDGER_COLUMNS } from "@/Admin/ledger/ledgerColumns";

interface KpiLedgerRowProps {
  label: string;
  total: ReactNode;
  detail: ReactNode;
  trend: ReactNode;
  testId: string;
  // Clickable KPI: the label becomes a link to the filtered users list.
  href?: string;
  // Extra control next to the label (e.g. a definition tooltip).
  hint?: ReactNode;
}

// Same DOM order serves both layouts: below `xl` a 2x2 grid (label | total over
// detail | trend — Figma 768/375 "KPI rows stacked"), from `xl` a single 40px ledger line.

export function KpiLedgerRow({
  label,
  total,
  detail,
  trend,
  testId,
  href,
  hint,
}: KpiLedgerRowProps) {
  // Color lives on the inner span: index.css has an unlayered `a:hover { color }`.
  const labelNode = (
    <span className="type-body-md min-w-0 truncate text-text-primary">
      {label}
    </span>
  );
  return (
    <li
      className={`grid ${KPI_LEDGER_COLUMNS} items-center gap-x-2 gap-y-1 border-b border-border-default py-2 xl:h-10 xl:gap-x-0 xl:py-0`}
      data-testid={testId}
    >
      <span className="flex min-w-0 items-center gap-1">
        {href ? (
          <Link
            href={href}
            className="flex min-w-0 rounded-xs underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
            data-testid={`${testId}-link`}
          >
            <span className="type-body-md min-w-0 truncate text-teal-700">
              {label} ›
            </span>
          </Link>
        ) : (
          labelNode
        )}
        {hint}
      </span>
      <span
        className="type-body-lg-strong text-right tabular-nums text-text-primary"
        data-testid={`${testId}-total`}
      >
        {total}
      </span>
      <span className="type-body-sm min-w-0 break-words text-text-secondary xl:truncate xl:pl-6">
        {detail}
      </span>
      <span className="flex justify-end xl:justify-start">{trend}</span>
    </li>
  );
}
