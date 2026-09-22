import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Skeleton,
} from "@lila-care/design-system";
import AdminLayout from "@/Admin/AdminLayout";
import { usePlans } from "@/Admin/usePlans";
import { useDiscounts } from "@/Admin/useDiscounts";
import { useSubscribers } from "@/Admin/useSubscribers";
import { PlansTable } from "@/Admin/PlansTable";
import { PlanPanel } from "@/Admin/PlanPanel";
import { DiscountsTable, DiscountRow } from "@/Admin/DiscountsTable";
import { DiscountPanel } from "@/Admin/DiscountPanel";
import { SubscribersTable } from "@/Admin/SubscribersTable";

type PanelState =
  { kind: "closed" } | { kind: "create" } | { kind: "edit"; id: string };

// --- Planes tab ---

function PlansSection() {
  const {
    plans,
    rows,
    loading,
    error,
    refetch,
    saving,
    saveError,
    clearSaveError,
    create,
    update,
  } = usePlans();
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });

  const openCreate = () => {
    clearSaveError();
    setPanel({ kind: "create" });
  };
  const openEdit = (planId: string) => {
    clearSaveError();
    setPanel({ kind: "edit", id: planId });
  };
  const close = () => setPanel({ kind: "closed" });

  const editingPlan =
    panel.kind === "edit"
      ? (plans.find((p) => p.planId === panel.id) ?? null)
      : null;

  return (
    <div className="flex" data-testid="plans-section">
      <div className="min-w-0 flex-1 p-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Planes</h1>
          <Button onClick={openCreate} data-testid="plans-create-button">
            + Crear plan
          </Button>
        </div>

        {loading && (
          <div className="space-y-2" data-testid="plans-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-200 bg-red-50 p-4"
            aria-live="polite"
            data-testid="plans-error"
          >
            <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
            <AlertDescription className="text-red-700">
              <p>Error al cargar los planes: {error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <PlansTable rows={rows} onEdit={openEdit} onCreate={openCreate} />
        )}
      </div>

      {panel.kind !== "closed" && (
        <PlanPanel
          plan={panel.kind === "edit" ? editingPlan : null}
          saving={saving}
          saveError={saveError}
          onCreate={create}
          onUpdate={update}
          onClose={close}
        />
      )}
    </div>
  );
}

// --- Descuentos tab ---

function DiscountsSection() {
  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const {
    discounts,
    loading,
    error,
    refetch,
    saving,
    saveError,
    clearSaveError,
    create,
    update,
  } = useDiscounts();
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });

  const openCreate = () => {
    clearSaveError();
    setPanel({ kind: "create" });
  };
  const openEdit = (discountId: string) => {
    clearSaveError();
    setPanel({ kind: "edit", id: discountId });
  };
  const close = () => setPanel({ kind: "closed" });

  const editingDiscount =
    panel.kind === "edit"
      ? (discounts.find((d) => d.discountId === panel.id) ?? null)
      : null;

  const planNameById = new Map(plans.map((p) => [p.planId, p.name]));
  const rows: DiscountRow[] = discounts.map((d) => ({
    ...d,
    planName: planNameById.get(d.planId) ?? "Plan eliminado",
  }));
  const activePlans = plans.filter((p) => p.status === "active");

  const isLoading = loading || plansLoading;
  const combinedError = error ?? plansError;

  return (
    <div className="flex" data-testid="discounts-section">
      <div className="min-w-0 flex-1 p-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Descuentos</h1>
          <Button onClick={openCreate} data-testid="discounts-create-button">
            + Crear descuento
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2" data-testid="discounts-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isLoading && combinedError && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-200 bg-red-50 p-4"
            aria-live="polite"
            data-testid="discounts-error"
          >
            <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
            <AlertDescription className="text-red-700">
              <p>Error al cargar los descuentos: {combinedError}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !combinedError && (
          <DiscountsTable rows={rows} onEdit={openEdit} onCreate={openCreate} />
        )}
      </div>

      {panel.kind !== "closed" && (
        <DiscountPanel
          discount={panel.kind === "edit" ? editingDiscount : null}
          planName={
            editingDiscount
              ? planNameById.get(editingDiscount.planId)
              : undefined
          }
          activePlans={activePlans}
          saving={saving}
          saveError={saveError}
          onCreate={create}
          onUpdate={update}
          onClose={close}
        />
      )}
    </div>
  );
}

// --- Suscriptoras tab (read-only) ---

function SubscribersSection() {
  const { items, hasMore, loading, loadingMore, error, refetch, loadMore } =
    useSubscribers();

  return (
    <div className="p-10" data-testid="subscribers-section">
      <h1 className="mb-6 text-2xl font-semibold">Suscriptoras</h1>

      {loading && (
        <div className="space-y-2" data-testid="subscribers-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Alert
          variant="destructive"
          className="rounded-xl border-red-200 bg-red-50 p-4"
          aria-live="polite"
          data-testid="subscribers-error"
        >
          <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
          <AlertDescription className="text-red-700">
            <p>Error al cargar las suscriptoras: {error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <SubscribersTable
          rows={items}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
}

// --- Page ---

type TabKey = "plans" | "discounts" | "subscribers";

function PlansPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("plans");

  const tabClass = (tab: TabKey) =>
    `mr-6 pb-3 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? "border-primary text-primary"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <AdminLayout>
      <div className="min-h-full bg-white" data-testid="plans-page">
        <div className="flex border-b border-gray-200 px-10 pt-8">
          <button
            onClick={() => setActiveTab("plans")}
            className={tabClass("plans")}
            data-testid="tab-plans"
          >
            Planes
          </button>
          <button
            onClick={() => setActiveTab("discounts")}
            className={tabClass("discounts")}
            data-testid="tab-discounts"
          >
            Descuentos
          </button>
          <button
            onClick={() => setActiveTab("subscribers")}
            className={tabClass("subscribers")}
            data-testid="tab-subscribers"
          >
            Suscriptoras
          </button>
        </div>

        {activeTab === "plans" && <PlansSection />}
        {activeTab === "discounts" && <DiscountsSection />}
        {activeTab === "subscribers" && <SubscribersSection />}
      </div>
    </AdminLayout>
  );
}

export default PlansPage;
