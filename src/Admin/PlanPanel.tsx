import { FormEvent, useState } from "react";
import {
  CreatePlanPayload,
  PlanDto,
  PlanStatus,
  UpdatePlanPayload,
} from "@/api/plans";
import { formatPlanStatus } from "@/Admin/plansFormat";
import { SidePanel, SidePanelFooter } from "@/Admin/ledger/SidePanel";
import { PLANS_PAGE_TITLE_ID } from "@/Admin/ledger/tabIds";
import { FIELD_CONTROL_CLASS, FormField } from "@/Admin/ledger/FormField";
import { LedgerButton, TextButton } from "@/Admin/ledger/LedgerButton";

interface PlanFormState {
  name: string;
  amountInPesos: string;
  intervalDays: string;
  maxInteractionsPerDay: string;
  description: string;
  status: PlanStatus;
}

function toFormState(plan: PlanDto | null): PlanFormState {
  if (!plan) {
    return {
      name: "",
      amountInPesos: "",
      intervalDays: "",
      maxInteractionsPerDay: "",
      description: "",
      status: "active",
    };
  }
  return {
    name: plan.name,
    amountInPesos: String(plan.amountInCents / 100),
    intervalDays: plan.intervalDays === null ? "" : String(plan.intervalDays),
    maxInteractionsPerDay:
      plan.maxInteractionsPerDay === null
        ? ""
        : String(plan.maxInteractionsPerDay),
    description: plan.description ?? "",
    status: plan.status,
  };
}

// "" (left blank) maps to `null` (unlimited / no billing cycle), matching the BE contract.
function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

function toPayloadFields(form: PlanFormState) {
  return {
    name: form.name.trim(),
    amountInCents: Math.round(Number(form.amountInPesos) * 100),
    intervalDays: parseOptionalInt(form.intervalDays),
    maxInteractionsPerDay: parseOptionalInt(form.maxInteractionsPerDay),
  };
}

interface PlanPanelProps {
  // `null` = create mode.
  plan: PlanDto | null;
  saving: boolean;
  saveError: string | null;
  onCreate: (payload: CreatePlanPayload) => Promise<PlanDto | null>;
  onUpdate: (
    planId: string,
    payload: UpdatePlanPayload,
  ) => Promise<PlanDto | null>;
  onClose: () => void;
}

interface StatusControlProps {
  status: PlanStatus;
  changed: boolean;
  onToggle: () => void;
}

// Ledger take on PR #41's toggle: current status as text + a text-link action. Deactivating
// still needs the second "¿Confirmar desactivación?" click on Guardar (see handleSubmit).
function StatusControl({ status, changed, onToggle }: StatusControlProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="type-caption text-text-secondary">Estado</span>
      <div className="flex items-baseline justify-between gap-4">
        <span
          className={`type-body-md ${status === "active" ? "text-primary" : "text-text-secondary"}`}
          data-testid="plan-status-value"
        >
          {formatPlanStatus(status)}
          {changed && " (sin guardar)"}
        </span>
        <TextButton onClick={onToggle} data-testid="plan-status-toggle">
          {status === "active" ? "Desactivar plan" : "Activar plan"}
        </TextButton>
      </div>
    </div>
  );
}

export function PlanPanel({
  plan,
  saving,
  saveError,
  onCreate,
  onUpdate,
  onClose,
}: PlanPanelProps) {
  const isEdit = plan !== null;
  const initialState = toFormState(plan);
  const [form, setForm] = useState<PlanFormState>(initialState);
  // Armed by the first "Guardar" click while a deactivation is pending — a second click on the
  // relabeled button is what actually submits the PATCH (see handleSubmit).
  const [confirmingDeactivation, setConfirmingDeactivation] = useState(false);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialState);
  const isDeactivating =
    isEdit && plan.status === "active" && form.status === "inactive";

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isDeactivating && !confirmingDeactivation) {
      setConfirmingDeactivation(true);
      return;
    }

    const fields = toPayloadFields(form);
    const description = form.description.trim();
    // Editing sends "" so a cleared description is actually cleared; on create an empty one is
    // simply omitted.
    const result = isEdit
      ? await onUpdate(plan.planId, {
          ...fields,
          description,
          status: form.status,
        })
      : await onCreate({
          ...fields,
          description: description || undefined,
          currency: "COP",
        });

    if (result) onClose();
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
      testId="plan-panel"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-6"
        data-testid="plan-form"
      >
        <div className="flex flex-col gap-4">
          <FormField label="Nombre" htmlFor="plan-name">
            <input
              id="plan-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className={FIELD_CONTROL_CLASS}
              data-testid="plan-name-input"
            />
          </FormField>

          <FormField label="Precio (COP)" htmlFor="plan-amount">
            <input
              id="plan-amount"
              type="number"
              inputMode="numeric"
              min={0}
              step="any"
              required
              value={form.amountInPesos}
              onChange={(e) => updateField("amountInPesos", e.target.value)}
              className={FIELD_CONTROL_CLASS}
              data-testid="plan-amount-input"
            />
          </FormField>

          <FormField
            label="Ciclo de cobro (días, opcional)"
            htmlFor="plan-interval-days"
          >
            <input
              id="plan-interval-days"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={form.intervalDays}
              onChange={(e) => updateField("intervalDays", e.target.value)}
              placeholder="Sin ciclo de cobro"
              className={FIELD_CONTROL_CLASS}
              data-testid="plan-interval-days-input"
            />
          </FormField>

          <FormField
            label="Límite de interacciones diarias (opcional)"
            htmlFor="plan-max-interactions"
          >
            <input
              id="plan-max-interactions"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={form.maxInteractionsPerDay}
              onChange={(e) =>
                updateField("maxInteractionsPerDay", e.target.value)
              }
              placeholder="Ilimitado"
              className={FIELD_CONTROL_CLASS}
              data-testid="plan-max-interactions-input"
            />
          </FormField>

          <FormField label="Descripción (opcional)" htmlFor="plan-description">
            <textarea
              id="plan-description"
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={`${FIELD_CONTROL_CLASS} resize-y`}
              data-testid="plan-description-input"
            />
          </FormField>

          {isEdit && (
            <StatusControl
              status={form.status}
              changed={form.status !== plan.status}
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
        </div>

        <div className="flex-1" />

        <SidePanelFooter error={saveError} errorTestId="plan-save-error">
          <LedgerButton
            tone="secondary"
            onClick={handleClose}
            data-testid="plan-cancel-button"
          >
            Cancelar
          </LedgerButton>
          <LedgerButton
            type="submit"
            disabled={saving}
            data-testid="plan-save-button"
          >
            {saveLabel}
          </LedgerButton>
        </SidePanelFooter>
      </form>
    </SidePanel>
  );
}
