import { ReactNode } from "react";
import { cn } from "@lila-care/design-system";

interface LedgerHeaderProps {
  children: ReactNode;
  // Column layout (grid template / display breakpoint) comes from the owning ledger so the
  // header cells line up with that ledger's rows.
  className?: string;
}

export function LedgerHeader({ children, className }: LedgerHeaderProps) {
  return (
    <div
      className={cn(
        "type-caption-medium h-8 items-center border-b border-border-default text-text-secondary",
        className,
      )}
    >
      {children}
    </div>
  );
}
