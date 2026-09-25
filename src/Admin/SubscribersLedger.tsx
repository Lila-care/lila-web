import { SubscriberListItemDto, SubscriberStatus } from "@/api/subscribers";
import {
  formatPeriodEnd,
  formatSubscriberSource,
  formatSubscriberStatus,
  summarizeSubscriber,
} from "@/Admin/plansFormat";
import { LedgerHeader } from "@/Admin/ledger/LedgerHeader";
import { SUBSCRIBERS_LEDGER_COLUMNS } from "@/Admin/ledger/ledgerColumns";
import {
  LedgerStatusText,
  ResponsiveLedgerRow,
  type LedgerStatusTone,
} from "@/Admin/ledger/ResponsiveLedgerRow";
import { MissingValue } from "@/Admin/ledger/MissingValue";
import { TextButton } from "@/Admin/ledger/LedgerButton";

const STATUS_TONE: Record<SubscriberStatus, LedgerStatusTone> = {
  active: "accent",
  past_due: "strong",
  canceled: "muted",
  none: "muted",
};

function SubscriberStatusText({ status }: { status: SubscriberStatus }) {
  return (
    <LedgerStatusText tone={STATUS_TONE[status]}>
      {formatSubscriberStatus(status)}
    </LedgerStatusText>
  );
}

interface LoadMoreProps {
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
}

// A failed page keeps the rows already shown; the retry reuses the same cursor.
function LoadMore({ loading, error, onLoadMore }: LoadMoreProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
        data-testid="subscribers-load-more-error"
      >
        <span className="type-body-sm text-text-primary">{error}</span>
        <TextButton
          onClick={onLoadMore}
          disabled={loading}
          data-testid="subscribers-load-more-retry"
        >
          {loading ? "Cargando…" : "Reintentar"}
        </TextButton>
      </div>
    );
  }
  return (
    <div>
      <TextButton
        onClick={onLoadMore}
        disabled={loading}
        data-testid="subscribers-load-more"
      >
        {loading ? "Cargando…" : "Cargar más"}
      </TextButton>
    </div>
  );
}

interface SubscribersLedgerProps {
  rows: SubscriberListItemDto[];
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
}

// Read-only: no actions column. Cursor pagination surfaces as a "Cargar más" text link — the
// BE only exposes a cursor, no total count or page numbers.
export function SubscribersLedger({
  rows,
  hasMore,
  loadingMore,
  loadMoreError,
  onLoadMore,
}: SubscribersLedgerProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="min-w-0">
        <LedgerHeader
          className={`hidden gap-x-4 lg:grid ${SUBSCRIBERS_LEDGER_COLUMNS}`}
        >
          <span>Email</span>
          <span>Plan</span>
          <span>Estado</span>
          <span>Vence</span>
          <span>Origen</span>
        </LedgerHeader>
        <ul className="flex flex-col gap-3 lg:gap-0">
          {rows.map((row) => (
            <ResponsiveLedgerRow
              key={row.userId}
              testId={`subscriber-row-${row.userId}`}
              columnsClass={SUBSCRIBERS_LEDGER_COLUMNS}
              stacked={{
                title: row.email ?? "Sin email",
                status: <SubscriberStatusText status={row.status} />,
                summary: summarizeSubscriber(
                  row.planName,
                  row.currentPeriodEnd,
                  row.source,
                ),
              }}
              cells={
                <>
                  <span
                    className={`type-body-md min-w-0 truncate ${
                      row.email ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {row.email ?? "Sin email"}
                  </span>
                  <span className="type-body-md min-w-0 break-words text-text-primary">
                    {row.planName}
                  </span>
                  <SubscriberStatusText status={row.status} />
                  <span className="type-body-sm text-text-secondary">
                    {row.currentPeriodEnd ? (
                      formatPeriodEnd(row.currentPeriodEnd)
                    ) : (
                      <MissingValue />
                    )}
                  </span>
                  <span className="type-body-sm text-text-secondary">
                    {formatSubscriberSource(row.source)}
                  </span>
                </>
              }
            />
          ))}
        </ul>
      </div>

      {hasMore && (
        <LoadMore
          loading={loadingMore}
          error={loadMoreError}
          onLoadMore={onLoadMore}
        />
      )}
    </div>
  );
}
