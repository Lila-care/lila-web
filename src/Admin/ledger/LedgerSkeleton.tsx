import { Skeleton } from "@lila-care/design-system";

interface LedgerSkeletonProps {
  rows: number;
  testId?: string;
}

// Figma loading state (314:754 / 314:1472): flat placeholder lines on the page background —
// no cards or boxes around them, same rhythm as the real ledger rows.
export function LedgerSkeleton({ rows, testId }: LedgerSkeletonProps) {
  return (
    <div className="flex flex-col" data-testid={testId} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-10 items-center gap-6 border-b border-border-default"
        >
          <Skeleton className="h-3 flex-1 rounded-xs bg-surface-brand-light" />
          <Skeleton className="h-3 w-16 rounded-xs bg-surface-brand-light" />
        </div>
      ))}
    </div>
  );
}
