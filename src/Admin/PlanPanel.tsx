import { FormEvent, useState } from "react";
import { CreatePlanPayload, PlanDto, UpdatePlanPayload } from "@/api/plans";
import { SidePanel, SidePanelFooter } from "@/Admin/ledger/SidePanel";
import { PLANS_PAGE_TITLE_ID } from "@/Admin/ledger/tabIds";
import { LedgerButton } from "@/Admin/ledger/LedgerButton";
import { PlanFeaturesState } from "@/Admin/usePlanFeatures";
import { EntitlementsSection } from "@/Admin/plans/EntitlementsSection";
import { useEntitlementsDraft } from "@/Admin/plans/useEntitlementsDraft";
import { describeUnsavedChanges } from "@/Admin/plans/entitlementsCopy";
import { PlanStatusField } from "@/Admin/plans/PlanStatusField";
import { useSubscriberCount } from "@/Admin/plans/useSubscriberCount";
import {
  ConfirmChangeDialog,
  type ConfirmPhase,
} from "@/Admin/plans/ConfirmChangeDialog";

import type { Reduction } from "@/Admin/plans/entitlementsReductions";
import { PlanBasicFields } from "@/Admin/plans/PlanBasicFields";
import { toFormState, toPayloadFields } from "@/Admin/plans/planForm";
import type { PlanFormState } from "@/Admin/plans/planForm";

interface PlanPanelProps {
  // `null` = create mode.
  plan: PlanDto | null;
  // Feature catalog (loaded by the page, shared with the plans ledger).
  catalog: PlanFeaturesState;
  // Edit mode only: the matrix cell that opened the panel — focus lands on that feature row.
  focusFeatureKey?: string;
  saving: boolean;
  saveError: string | null;
  onClearSaveError: () => void;
  onCreate: (payload: CreatePlanPayload) => Promise<PlanDto | null>;
  onUpdate: (
    planId: string,
    payload: UpdatePlanPayload,
  ) => Promise<PlanDto | null>;
  onClose: () => void;
}

interface ImpactSnapshot {
  count: number;
  reductions: Reduction[];
}

function confirmPhase(
  saved: boolean,
  saving: boolean,
  saveError: string | null,
): ConfirmPhase {
  if (saved) return "success";
  if (saving) return "saving";
  return saveError ? "error" : "confirm";
}

export function PlanPanel({
  plan,
  catalog,
  focusFeatureKey,
  saving,
  saveError,
  onClearSaveError,
  onCreate,
  onUpdate,
  onClose,
}: PlanPanelProps) {
  const isEdit = plan !== null;
  const initialState = toFormState(plan);
  const [form, setForm] = useState<PlanFormState>(initialState);
  const entitlements = useEntitlementsDraft(
    catalog.features,
    plan?.entitlements,
  );
  const subscribers = useSubscriberCount();
  // Armed by the first "Guardar" click while a deactivation is pending — a second click on the
  // relabeled button is what actually submits the PATCH (see handleSubmit).
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);
  // Set when the save needs the "Confirmar cambio" step. Frozen at that moment: after saving,
  // the refetch moves the baseline and the live reductions would come back empty.
  const [impact, setImpact] = useState<ImpactSnapshot | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialState) ||
    entitlements.modifiedCount > 0;
  const isDeactivating =
    isEdit && plan.status === "active" && form.status === "inactive";
  // Only an active plan whose change takes access away can need confirmation (and only if it
  // has subscribers — checked on submit).
  const reducesAccess =
    isEdit && plan.status === "active" && entitlements.reductions.length > 0;

  function updateField<K extends keyof PlanFormState>(
    key: K,
    value: PlanFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setConfirmingDeactivation(false);
  }

  function handleToggleStatus() {
    updateField("status", form.status === "active" ? "inactive" : "active");
  }

  function handleClose() {
    if (isDirty && !window.confirm("¿Descartar los cambios sin guardar?")) {
      return;
    }
    onClose();
  }

  async function persist(): Promise<PlanDto | null> {
    const fields = toPayloadFields(form);
    const description = form.description.trim();
    // Only the characteristics the admin actually changed travel in the request.
    const changedEntitlements =
      Object.keys(entitlements.changes).length > 0
        ? { entitlements: entitlements.changes }
        : {};
    // Editing sends "" so a cleared description is actually cleared; on create an empty one is
    // simply omitted.
    return isEdit
      ? onUpdate(plan.planId, {
          ...fields,
          ...changedEntitlements,
          description,
          status: form.status,
        })
      : onCreate({
          ...fields,
          ...changedEntitlements,
          description: description || undefined,
          currency: "COP",
        });
  }

  async function save() {
    const result = await persist();
    if (!result) return;
    if (impact === null) onClose();
    else setSaved(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isDeactivating && !confirmingDeactivation) {
      setConfirmingDeactivation(true);
      return;
    }
    if (reducesAccess) {
      const count = await subscribers.count(plan.planId);
      if (count === null) return;
      if (count > 0) {
        setImpact({ count, reductions: entitlements.reductions });
        return;
      }
    }
    await save();
  }

  function handleCancelConfirm() {
    setImpact(null);
    onClearSaveError();
  }

  const saveLabel = saving
    ? "Guardando…"
    : isDeactivating && confirmingDeactivation
      ? "¿Confirmar desactivación?"
      : "Guardar";

  return (
    <SidePanel
      title={isEdit ? "Editar plan" : "Nuevo plan"}
      titleId="plan-panel-title"
      onRequestClose={handleClose}
      fallbackFocusId={PLANS_PAGE_TITLE_ID}
      initialFocusSelector={
        focusFeatureKey ? `[data-feature-row="${focusFeatureKey}"]` : undefined
      }
      testId="plan-panel"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-6"
        data-testid="plan-form"
      >
        <div className="flex flex-col gap-4">
          <PlanBasicFields form={form} onChange={updateField} />

          {isEdit && (
            <PlanStatusField
              status={form.status}
              changed={form.status !== plan.status}
              disabled={plan.status === "coming_soon"}
              onToggle={handleToggleStatus}
            />
          )}

          {/* Always mounted so screen readers announce the text when it appears. */}
          <div role="status" aria-live="polite">
            {isDeactivating && confirmingDeactivation && (
              <p
                className="type-body-sm text-text-primary"
                data-testid="plan-deactivate-warning"
              >
                Este plan dejará de estar disponible para nuevas suscripciones.
                Volvé a tocar el botón para confirmar.
              </p>
            )}
          </div>

          <EntitlementsSection
            catalog={catalog}
            baseline={entitlements.baseline}
            draft={entitlements.draft}
            unlocked={entitlements.unlocked}
            onChange={entitlements.setFeature}
            onCustomize={entitlements.customize}
            onReset={entitlements.resetToDefault}
          />
        </div>

        <div className="flex-1" />

        <SidePanelFooter
          error={subscribers.error ?? (impact === null ? saveError : null)}
          errorTestId="plan-save-error"
        >
          <div className="mr-auto flex flex-col gap-1 self-center">
            {entitlements.modifiedCount > 0 && (
              <span
                className="type-body-md-strong text-text-primary"
                data-testid="plan-unsaved-summary"
              >
                {describeUnsavedChanges(entitlements.modifiedCount)}
              </span>
            )}
            {entitlements.hasInvalid && (
              <span
                className="type-body-sm text-text-secondary"
                data-testid="plan-invalid-hint"
              >
                Corregir los valores de las filas señaladas antes de guardar.
              </span>
            )}
          </div>
          <LedgerButton
            tone="secondary"
            onClick={handleClose}
            data-testid="plan-cancel-button"
          >
            Cancelar
          </LedgerButton>
          <LedgerButton
            type="submit"
            disabled={saving || subscribers.checking || entitlements.hasInvalid}
            data-testid="plan-save-button"
          >
            {saveLabel}
          </LedgerButton>
        </SidePanelFooter>
      </form>

      {impact !== null && plan && (
        <ConfirmChangeDialog
          planName={plan.name}
          subscriberCount={impact.count}
          reductions={impact.reductions}
          phase={confirmPhase(saved, saving, saveError)}
          onConfirm={save}
          onCancel={handleCancelConfirm}
          onDone={onClose}
        />
      )}
    </SidePanel>
  );
}
