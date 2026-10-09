import { cn } from "@lila-care/design-system";

interface LedgerBarProps {
  // 0..1 share of the row over its breakdown total.
  ratio: number;
  // Overrides the default 64px track (the funnel uses the 100px Figma track).
  className?: string;
}

export function LedgerBar({ ratio, className }: LedgerBarProps) {
  const widthPercent = Math.min(Math.max(ratio, 0), 1) * 100;
  return (
    <div
      className={cn(
        "h-1 w-16 shrink-0 overflow-hidden rounded-xs bg-surface-brand-medium",
        className,
      )}
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
