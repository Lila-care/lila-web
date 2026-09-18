import { useEffect, useRef, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import AdminLayout from "@/Admin/AdminLayout";
import { DeactivateDiscountDialog } from "@/Admin/DeactivateDiscountDialog";
import { DiscountFilters } from "@/Admin/DiscountFilters";
import { DiscountFormDialog } from "@/Admin/DiscountFormDialog";
import { OVERLAP_ACTIVATE_ERROR } from "@/Admin/discountForm";
import { DiscountCardList, DiscountsTable } from "@/Admin/DiscountsTable";
import {
  DiscountsErrorAlert,
  DiscountsSkeleton,
  NoDiscountsEmptyState,
  NoResultsEmptyState,
} from "@/Admin/DiscountsStates";
import { useDiscounts } from "@/Admin/useDiscounts";
import {
  DiscountApiError,
  type DiscountDto,
  type DiscountStatus,
} from "@/api/discounts";
import {
  Alert,
  AlertDescription,
  Banner,
  Button,
} from "@lila-care/design-system";
import { cn } from "@/lib/utils";

type FormTarget = { kind: "create" } | { kind: "edit"; discount: DiscountDto };

const SUCCESS_BANNER_MS = 6000;

const STATUS_SUCCESS: Record<DiscountStatus, string> = {
  active: "Descuento activado.",
  inactive: "Descuento desactivado.",
};

const STATUS_FAILURE: Record<DiscountStatus, string> = {
  active: "No se pudo activar el descuento. Inténtalo de nuevo.",
  inactive: "No se pudo desactivar el descuento. Inténtalo de nuevo.",
};

function DiscountsPage() {
  const discounts = useDiscounts();
  const {
    plans,
    filters,
    isInitialLoading,
    isRefetching,
    error,
    hasActiveFilters,
  } = discounts;

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<DiscountDto | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyDiscountId, setBusyDiscountId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), SUCCESS_BANNER_MS);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Announce the result count after a filter change, never on the first mount (it would be
  // redundant noise for a screen reader user who just landed on the page).
  useEffect(() => {
    if (isInitialLoading || isRefetching || error) return;
    if (hasLoadedOnceRef.current) {
      const count = discounts.discounts.length;
      setAnnouncement(count === 0 ? "Sin descuentos" : `${count} descuentos`);
    }
    hasLoadedOnceRef.current = true;
  }, [discounts.discounts, isInitialLoading, isRefetching, error]);

  const planNameById = new Map(plans.map((p) => [p.planId, p.name]));
  // Never show an empty cell: fall back to the raw planId when the plan is not in the list.
  const getPlanName = (planId: string) => planNameById.get(planId) ?? planId;

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setActionError(null);
  };

  const changeStatus = async (
    discount: DiscountDto,
    status: DiscountStatus,
  ) => {
    setBusyDiscountId(discount.discountId);
    setActionError(null);
    try {
      await discounts.update(discount.discountId, { status });
      showSuccess(STATUS_SUCCESS[status]);
      // The row may vanish under the active status filter; keep keyboard focus somewhere real.
      if (filters.status !== "all") headingRef.current?.focus();
    } catch (e) {
      setSuccessMessage(null);
      setActionError(
        status === "active" && e instanceof DiscountApiError && e.status === 409
          ? OVERLAP_ACTIVATE_ERROR
          : STATUS_FAILURE[status],
      );
    } finally {
      setBusyDiscountId(null);
    }
  };

  const handleToggleStatus = (discount: DiscountDto) => {
    if (discount.status === "active") setDeactivateTarget(discount);
    else void changeStatus(discount, "active");
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    await changeStatus(deactivateTarget, "inactive");
    setDeactivateTarget(null);
  };

  const openCreate = () => setFormTarget({ kind: "create" });

  const renderResults = () => {
    if (isInitialLoading) return <DiscountsSkeleton />;
    if (error) {
      return <DiscountsErrorAlert message={error} onRetry={discounts.retry} />;
    }
    if (discounts.discounts.length === 0) {
      return hasActiveFilters ? (
        <NoResultsEmptyState onClear={discounts.clearFilters} />
      ) : (
        <NoDiscountsEmptyState onCreate={openCreate} />
      );
    }
    const listProps = {
      discounts: discounts.discounts,
      getPlanName,
      busyDiscountId,
      onEdit: (discount: DiscountDto) =>
        setFormTarget({ kind: "edit", discount }),
      onToggleStatus: handleToggleStatus,
    };
    return (
      <>
        <DiscountsTable {...listProps} />
        <DiscountCardList {...listProps} />
      </>
    );
  };

  return (
    <AdminLayout>
      <div
        className="min-h-full w-full bg-neutral-50 px-4 py-6 sm:px-6 lg:px-10 lg:py-8"
        data-testid="discounts-page"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-semibold text-neutral-900 outline-none"
              >
                Descuentos
              </h1>
              <p className="text-sm text-neutral-600">
                Descuentos automáticos y códigos por plan
              </p>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isInitialLoading}
              onClick={openCreate}
              data-testid="discounts-create-button"
            >
              <Plus aria-hidden="true" />
              Nuevo descuento
            </Button>
          </div>

          {successMessage && (
            <div data-testid="discounts-success">
              <Banner
                variant="success"
                message={successMessage}
                onDismiss={() => setSuccessMessage(null)}
              />
            </div>
          )}
          {actionError && (
            <Alert
              variant="destructive"
              data-testid="discounts-action-error"
              className="rounded-xl border-red-200 bg-red-50 p-4"
            >
              <AlertCircle aria-hidden="true" />
              <AlertDescription className="flex items-start justify-between gap-3 text-red-700">
                <span className="min-w-0 break-words">{actionError}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActionError(null)}
                >
                  Cerrar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <DiscountFilters
            plans={plans}
            filters={filters}
            disabled={isInitialLoading}
            isRefetching={isRefetching}
            hasActiveFilters={hasActiveFilters}
            onPlanChange={discounts.setPlanFilter}
            onStatusChange={discounts.setStatusFilter}
            onClear={discounts.clearFilters}
          />

          <div
            aria-busy={isInitialLoading || isRefetching}
            className={cn(isRefetching && "opacity-60")}
          >
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
            {renderResults()}
          </div>
        </div>
      </div>

      {formTarget && (
        <DiscountFormDialog
          editing={formTarget.kind === "edit" ? formTarget.discount : undefined}
          plans={plans}
          onCreate={async (payload) => {
            await discounts.create(payload);
            showSuccess("Descuento creado.");
          }}
          onUpdate={async (discountId, payload) => {
            await discounts.update(discountId, payload);
            showSuccess("Cambios guardados.");
          }}
          onClose={() => setFormTarget(null)}
        />
      )}
      {deactivateTarget && (
        <DeactivateDiscountDialog
          discount={deactivateTarget}
          planName={getPlanName(deactivateTarget.planId)}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivateTarget(null)}
        />
      )}
    </AdminLayout>
  );
}

export default DiscountsPage;
