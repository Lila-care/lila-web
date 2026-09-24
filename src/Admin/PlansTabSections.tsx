import { ReactNode } from "react";
import { usePlans } from "@/Admin/usePlans";
import { useSubscribers } from "@/Admin/useSubscribers";
import { PlansLedger } from "@/Admin/PlansLedger";
import { DiscountsLedger, DiscountRow } from "@/Admin/DiscountsLedger";
import { SubscribersLedger } from "@/Admin/SubscribersLedger";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { LedgerEmptyState } from "@/Admin/ledger/LedgerEmptyState";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import { tabId, tabPanelId } from "@/Admin/ledger/tabIds";

export type PlansTabKey = "plans" | "discounts" | "subscribers";

interface TabSectionProps {
  tab: PlansTabKey;
  title: string;
  loading: boolean;
  error: string | null;
  errorMessage: string;
  onRetry: () => void;
  isEmpty: boolean;
  empty: ReactNode;
  children: ReactNode;
}

// One tabpanel = the 4 states on the Ledger surface. The SectionTitle repeats the tab label,
// so the stacked 375 layout (Figma 332:2255) drops it.
function TabSection({
  tab,
  title,
  loading,
  error,
  errorMessage,
  onRetry,
  isEmpty,
  empty,
  children,
}: TabSectionProps) {
  return (
    <section
      role="tabpanel"
      id={tabPanelId(tab)}
      aria-labelledby={tabId(tab)}
      className="flex min-w-0 flex-col gap-4"
      data-testid={`${tab}-section`}
    >
      <div className="hidden md:block">
        <SectionTitle id={`${tab}-section-title`} title={title} />
      </div>
      {loading && <LedgerSkeleton rows={4} testId={`${tab}-loading`} />}
      {!loading && error && (
        <LedgerError
          message={errorMessage}
          detail={error}
          onRetry={onRetry}
          testId={`${tab}-error`}
        />
      )}
      {!loading && !error && (isEmpty ? empty : children)}
    </section>
  );
}

interface PlansTabProps {
  plans: ReturnType<typeof usePlans>;
  onCreate: () => void;
  onEdit: (planId: string) => void;
}

export function PlansTab({ plans, onCreate, onEdit }: PlansTabProps) {
  return (
    <TabSection
      tab="plans"
      title="Planes"
      loading={plans.loading}
      error={plans.error}
      errorMessage="No pudimos cargar los planes."
      onRetry={plans.refetch}
      isEmpty={plans.rows.length === 0}
      empty={
        <LedgerEmptyState
          title="Todavía no hay planes creados"
          description="Creá el primer plan para empezar a ofrecer suscripciones."
          testId="plans-empty"
          action={
            <LedgerButton onClick={onCreate} data-testid="plans-empty-create">
              Crear plan
            </LedgerButton>
          }
        />
      }
    >
      <PlansLedger rows={plans.rows} onEdit={onEdit} />
    </TabSection>
  );
}

interface DiscountsTabProps {
  rows: DiscountRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (discountId: string) => void;
}

export function DiscountsTab({
  rows,
  loading,
  error,
  onRetry,
  onCreate,
  onEdit,
}: DiscountsTabProps) {
  return (
    <TabSection
      tab="discounts"
      title="Descuentos"
      loading={loading}
      error={error}
      errorMessage="No pudimos cargar los descuentos."
      onRetry={onRetry}
      isEmpty={rows.length === 0}
      empty={
        <LedgerEmptyState
          title="Todavía no hay descuentos creados"
          description="Creá un descuento para promocionar un plan."
          testId="discounts-empty"
          action={
            <LedgerButton
              onClick={onCreate}
              data-testid="discounts-empty-create"
            >
              Crear descuento
            </LedgerButton>
          }
        />
      }
    >
      <DiscountsLedger rows={rows} onEdit={onEdit} />
    </TabSection>
  );
}

export function SubscribersTab({
  subscribers,
}: {
  subscribers: ReturnType<typeof useSubscribers>;
}) {
  return (
    <TabSection
      tab="subscribers"
      title="Suscriptoras"
      loading={subscribers.loading}
      error={subscribers.error}
      errorMessage="No pudimos cargar las suscriptoras."
      onRetry={subscribers.refetch}
      isEmpty={subscribers.items.length === 0}
      empty={
        <LedgerEmptyState
          title="Todavía no hay suscriptoras"
          testId="subscribers-empty"
        />
      }
    >
      <SubscribersLedger
        rows={subscribers.items}
        hasMore={subscribers.hasMore}
        loadingMore={subscribers.loadingMore}
        loadMoreError={subscribers.loadMoreError}
        onLoadMore={subscribers.loadMore}
      />
    </TabSection>
  );
}
