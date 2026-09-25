interface LedgerBarProps {
  // 0..1 share of the row over its breakdown total.
  ratio: number;
}

export function LedgerBar({ ratio }: LedgerBarProps) {
  const widthPercent = Math.min(Math.max(ratio, 0), 1) * 100;
  return (
    <div
      className="h-1 w-16 shrink-0 overflow-hidden rounded-xs bg-surface-brand-medium"
      aria-hidden="true"
      data-testid="ledger-bar"
    >
      <div
        className="h-full rounded-xs bg-text-secondary"
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
}
