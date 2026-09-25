import { ReactNode } from "react";

interface LedgerEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  testId: string;
}

// Figma Gestión de Planes empty state: dashed outline on the page surface (no card fill), so
// the "nothing here yet" box keeps the Ledger's single visual weight.
export function LedgerEmptyState({
  title,
  description,
  action,
  testId,
}: LedgerEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 border border-dashed border-border-default px-4 py-16 text-center"
      data-testid={testId}
    >
      <p className="type-h3 text-text-primary">{title}</p>
      {description && (
        <p className="type-body-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
