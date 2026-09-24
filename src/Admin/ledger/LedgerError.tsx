import { AlertCircle } from "lucide-react";
import { Button } from "@lila-care/design-system";

interface LedgerErrorProps {
  message: string;
  detail?: string;
  onRetry: () => void;
  testId: string;
}

// Figma error state (314:1172 / 314:1678): plain message + retry on the page surface — no
// red alert card, the Ledger keeps a single visual weight even when something fails.
export function LedgerError({
  message,
  detail,
  onRetry,
  testId,
}: LedgerErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 py-4"
      data-testid={testId}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="type-body-md-strong text-text-primary">{message}</p>
          {detail && (
            <p className="type-body-sm break-words text-text-secondary">
              {detail}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="rounded-(--radius-ledger-sm) border-border-strong"
      >
        Reintentar
      </Button>
    </div>
  );
}
