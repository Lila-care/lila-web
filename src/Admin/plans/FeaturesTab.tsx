import { PlanDto } from "@/api/plans";
import { PlanFeaturesState } from "@/Admin/usePlanFeatures";
import { LedgerEmptyState } from "@/Admin/ledger/LedgerEmptyState";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import { tabId, tabPanelId } from "@/Admin/ledger/tabIds";
import { FeaturesMatrix } from "@/Admin/plans/FeaturesMatrix";

interface FeaturesTabProps {
  plans: PlanDto[];
  plansLoading: boolean;
  plansError: string | null;
  catalog: PlanFeaturesState;
  onRetry: () => void;
  onSelect: (planId: string, featureKey: string) => void;
}

function TabBody({
  plans,
  plansLoading,
  plansError,
  catalog,
  onRetry,
  onSelect,
}: FeaturesTabProps) {
  if (plansLoading || catalog.loading) {
    return <LedgerSkeleton rows={6} testId="features-loading" />;
  }
  const error = plansError ?? catalog.error;
  if (error) {
    return (
      <LedgerError
        message="No pudimos cargar las características."
        detail={error}
        onRetry={onRetry}
        testId="features-error"
      />
    );
  }
  if (plans.length === 0 || catalog.features.length === 0) {
    return (
      <LedgerEmptyState
        title="Todavía no hay características para mostrar"
        description="Creá un plan para ver sus características."
        testId="features-empty"
      />
    );
  }
  return (
    <FeaturesMatrix
      plans={plans}
      features={catalog.features}
      onSelect={onSelect}
    />
  );
}

// Fourth tab of Gestión de Planes: the plans × catalog matrix with its 4 states.
export function FeaturesTab(props: FeaturesTabProps) {
  return (
    <section
      role="tabpanel"
      id={tabPanelId("features")}
      aria-labelledby={tabId("features")}
      className="flex min-w-0 flex-col gap-4"
      data-testid="features-section"
    >
      <TabBody {...props} />
    </section>
  );
}
