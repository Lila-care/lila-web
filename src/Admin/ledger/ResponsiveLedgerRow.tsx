import { ReactNode } from "react";
import { cn } from "@lila-care/design-system";

export type LedgerStatusTone = "accent" | "muted" | "strong";

const STATUS_TONE_CLASS: Record<LedgerStatusTone, string> = {
  accent: "text-primary",
  muted: "text-text-secondary",
  strong: "text-text-primary",
};

// Status is plain body-sm text (no pill): the tone alone tells "Activo" from "Inactivo".
export function LedgerStatusText({
  tone,
  children,
}: {
  tone: LedgerStatusTone;
  children: ReactNode;
}) {
  return (
    <span className={cn("type-body-sm", STATUS_TONE_CLASS[tone])}>
      {children}
    </span>
  );
}

interface StackedContent {
  title: string;
  status: ReactNode;
  summary: string;
}

interface ResponsiveLedgerRowProps {
  testId: string;
  // Grid template from ledgerColumns.ts, shared with the ledger's LedgerHeader.
  columnsClass: string;
  cells: ReactNode;
  stacked: StackedContent;
  // Multi-line cells (a promo price) top-align the row and let it grow past 32px.
  alignTop?: boolean;
  // Below `lg` there's no room for an "Editar" column (Figma 375), so the whole stacked row
  // becomes the edit trigger. Omit for read-only ledgers.
  onOpen?: () => void;
}

function StackedBody({ title, status, summary }: StackedContent) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className="type-body-md-strong min-w-0 break-words text-text-primary">
          {title}
        </span>
        <span className="shrink-0">{status}</span>
      </span>
      <span className="type-body-sm break-words text-text-secondary">
        {summary}
      </span>
    </>
  );
}

const STACKED_CLASS =
  "flex w-full flex-col gap-1 border-b border-border-default pb-3 text-left lg:hidden";

export function ResponsiveLedgerRow({
  testId,
  columnsClass,
  cells,
  stacked,
  alignTop = false,
  onOpen,
}: ResponsiveLedgerRowProps) {
  return (
    <li data-testid={testId}>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={STACKED_CLASS}
          data-testid={`${testId}-open`}
        >
          {/* The row's own text stays the accessible name; "Editar" says what tapping does. */}
          <span className="sr-only">Editar </span>
          <StackedBody {...stacked} />
        </button>
      ) : (
        <div className={STACKED_CLASS}>
          <StackedBody {...stacked} />
        </div>
      )}
      <div
        className={cn(
          "hidden min-h-8 gap-x-4 border-b border-border-default lg:grid",
          columnsClass,
          alignTop ? "items-start py-2" : "items-center py-1",
        )}
      >
        {cells}
      </div>
    </li>
  );
}
