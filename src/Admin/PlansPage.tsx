import { useState } from "react";
import AdminLayout from "@/Admin/AdminLayout";
import { FeatureDefinition } from "@/api/plans";
import { usePlans } from "@/Admin/usePlans";
import { usePlanFeatures } from "@/Admin/usePlanFeatures";
import { useDiscounts } from "@/Admin/useDiscounts";
import { useSubscribers } from "@/Admin/useSubscribers";
import {
  describeDiscountCount,
  describePlanCount,
  describeSubscriberCount,
} from "@/Admin/plansFormat";
import { DiscountRow } from "@/Admin/DiscountsLedger";
import { FeaturesTab } from "@/Admin/plans/FeaturesTab";
import { PlanPanel } from "@/Admin/PlanPanel";
import { DiscountPanel } from "@/Admin/DiscountPanel";
import {
  DiscountsTab,
  PlansTab,
  SubscribersTab,
  type PlansTabKey,
} from "@/Admin/PlansTabSections";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import { LedgerTabs, type LedgerTab } from "@/Admin/ledger/LedgerTabs";
import { PLANS_PAGE_TITLE_ID } from "@/Admin/ledger/tabIds";

const TABS: LedgerTab<PlansTabKey>[] = [
  { id: "plans", label: "Planes" },
  { id: "discounts", label: "Descuentos" },
  { id: "subscribers", label: "Suscriptoras" },
  { id: "features", label: "Características" },
];

type PanelState =
  | { kind: "closed" }
  | { kind: "create" }
  // `featureKey` = the matrix cell that opened it; focus lands on that feature's row.
  | { kind: "edit"; id: string; featureKey?: string };

function usePanelState(onOpen: () => void) {
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });
  return {
    panel,
    openCreate: () => {
      onOpen();
      setPanel({ kind: "create" });
    },
    openEdit: (id: string, featureKey?: string) => {
      onOpen();
      setPanel({ kind: "edit", id, featureKey });
    },
    close: () => setPanel({ kind: "closed" }),
  };
}

// Edit mode renders only once the entity is in the loaded list — otherwise a refetch in
// flight would make the panel fall back to create mode with an empty form.
function resolvePanelEntity<T>(
  panel: PanelState,
  find: (id: string) => T | undefined,
): { open: boolean; entity: T | null } {
  if (panel.kind === "closed") return { open: false, entity: null };
  if (panel.kind === "create") return { open: true, entity: null };
  const entity = find(panel.id) ?? null;
  return { open: entity !== null, entity };
}

interface HeaderAction {
  label: string;
  onClick: () => void;
  testId: string;
}

interface PageHeaderProps {
  title: string;
  subtitle: string | null;
  action: HeaderAction | null;
}

function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1
          id={PLANS_PAGE_TITLE_ID}
          tabIndex={-1}
          className="type-h2 md:type-h1 text-text-primary focus:outline-none"
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="type-body-sm text-text-secondary"
            data-testid="plans-page-subtitle"
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <LedgerButton
          onClick={action.onClick}
          className="hidden shrink-0 md:inline-flex"
          data-testid={action.testId}
        >
          {action.label}
        </LedgerButton>
      )}
    </header>
  );
}

// Plans + discounts are small catalogs loaded on mount (the Descuentos tab needs plan names
// and the Planes tab needs active discounts); the subscriber scan waits for its tab.
function usePlansPageData(features: FeatureDefinition[]) {
  const [subscribersRequested, setSubscribersRequested] = useState(false);
  const plans = usePlans(features);
  const discounts = useDiscounts();
  const subscribers = useSubscribers(subscribersRequested);

  // A discount change can add/remove a plan's inline promo, so the plan list reloads too.
  const createDiscount: typeof discounts.create = async (payload) => {
    const created = await discounts.create(payload);
    if (created) plans.refetch();
    return created;
  };
  const updateDiscount: typeof discounts.update = async (id, payload) => {
    const updated = await discounts.update(id, payload);
    if (updated) plans.refetch();
    return updated;
  };

  const planNameById = new Map(plans.plans.map((p) => [p.planId, p.name]));
  const discountRows: DiscountRow[] = discounts.discounts.map((d) => ({
    ...d,
    planName: planNameById.get(d.planId) ?? "Plan eliminado",
  }));

  return {
    plans,
    discounts,
    subscribers,
    requestSubscribers: () => setSubscribersRequested(true),
    createDiscount,
    updateDiscount,
    discountRows,
    discountsLoading: discounts.loading || plans.loading,
    discountsError: discounts.error ?? plans.error,
    retryDiscounts: () => {
      discounts.refetch();
      plans.refetch();
    },
  };
}

type PlansPageData = ReturnType<typeof usePlansPageData>;

const FEATURES_SUBTITLE =
  "Valores efectivos del catálogo. Una configuración para todas las suscriptoras de cada plan.";

function headerSubtitle(tab: PlansTabKey, data: PlansPageData): string | null {
  const { plans, subscribers } = data;
  switch (tab) {
    case "plans":
      return plans.loading || plans.error
        ? null
        : describePlanCount(plans.plans);
    case "discounts":
      return data.discountsLoading || data.discountsError
        ? null
        : describeDiscountCount(data.discounts.discounts);
    case "features":
      return FEATURES_SUBTITLE;
    case "subscribers":
      return subscribers.loading || subscribers.error
        ? null
        : describeSubscriberCount(
            subscribers.items.length,
            subscribers.hasMore,
          );
  }
}

function PlansPage() {
  const [activeTab, setActiveTab] = useState<PlansTabKey>("plans");
  const planFeatures = usePlanFeatures();
  const data = usePlansPageData(planFeatures.features);
  const { plans, discounts } = data;
  const planPanel = usePanelState(plans.clearSaveError);
  const discountPanel = usePanelState(discounts.clearSaveError);

  const changeTab = (tab: PlansTabKey) => {
    setActiveTab(tab);
    if (tab === "subscribers") data.requestSubscribers();
  };

  const actions: Record<PlansTabKey, HeaderAction | null> = {
    plans: {
      label: "Crear plan",
      onClick: planPanel.openCreate,
      testId: "plans-create-button",
    },
    discounts: {
      label: "Crear descuento",
      onClick: discountPanel.openCreate,
      testId: "discounts-create-button",
    },
    subscribers: null,
    features: null,
  };
  const action = actions[activeTab];

  const planEditor = resolvePanelEntity(planPanel.panel, (id) =>
    plans.plans.find((p) => p.planId === id),
  );
  const discountEditor = resolvePanelEntity(discountPanel.panel, (id) =>
    discounts.discounts.find((d) => d.discountId === id),
  );

  return (
    <AdminLayout>
      <div
        className="flex min-h-full flex-col gap-5 px-5 py-6 md:gap-0 md:px-8 md:pt-8 md:pb-10 lg:pt-10 lg:pr-10 lg:pb-16 lg:pl-16"
        data-testid="plans-page"
      >
        <PageHeader
          title={
            activeTab === "features"
              ? "Características por plan"
              : "Gestión de Planes"
          }
          subtitle={headerSubtitle(activeTab, data)}
          action={action}
        />

        <div className="md:mt-2">
          <LedgerTabs
            tabs={TABS}
            activeId={activeTab}
            onChange={changeTab}
            label="Secciones de planes"
          />
        </div>

        {/* Figma 375: the create action drops below the tabs, full width. */}
        {action && (
          <LedgerButton
            onClick={action.onClick}
            className="w-full md:hidden"
            data-testid={`${action.testId}-mobile`}
          >
            {action.label}
          </LedgerButton>
        )}

        <div className="min-w-0 md:mt-6">
          {activeTab === "plans" && (
            <PlansTab
              plans={plans}
              features={planFeatures.features}
              onCreate={planPanel.openCreate}
              onEdit={planPanel.openEdit}
            />
          )}
          {activeTab === "discounts" && (
            <DiscountsTab
              rows={data.discountRows}
              loading={data.discountsLoading}
              error={data.discountsError}
              onRetry={data.retryDiscounts}
              onCreate={discountPanel.openCreate}
              onEdit={discountPanel.openEdit}
            />
          )}
          {activeTab === "subscribers" && (
            <SubscribersTab subscribers={data.subscribers} />
          )}
          {activeTab === "features" && (
            <FeaturesTab
              plans={plans.plans}
              plansLoading={plans.loading}
              plansError={plans.error}
              catalog={planFeatures}
              onRetry={() => {
                plans.refetch();
                planFeatures.refetch();
              }}
              onSelect={planPanel.openEdit}
            />
          )}
        </div>
      </div>

      {planEditor.open && (
        <PlanPanel
          plan={planEditor.entity}
          catalog={planFeatures}
          focusFeatureKey={
            planPanel.panel.kind === "edit"
              ? planPanel.panel.featureKey
              : undefined
          }
          saving={plans.saving}
          saveError={plans.saveError}
          onClearSaveError={plans.clearSaveError}
          onCreate={plans.create}
          onUpdate={plans.update}
          onClose={planPanel.close}
        />
      )}

      {discountEditor.open && (
        <DiscountPanel
          discount={discountEditor.entity}
          planName={
            data.discountRows.find(
              (row) => row.discountId === discountEditor.entity?.discountId,
            )?.planName
          }
          activePlans={plans.plans.filter((p) => p.status === "active")}
          saving={discounts.saving}
          saveError={discounts.saveError}
          onCreate={data.createDiscount}
          onUpdate={data.updateDiscount}
          onClose={discountPanel.close}
        />
      )}
    </AdminLayout>
  );
}

export default PlansPage;
