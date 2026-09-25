import { FormEvent, useState } from "react";
import { cn } from "@lila-care/design-system";
import { PlanDto } from "@/api/plans";
import {
  CreateDiscountPayload,
  DiscountDto,
  DiscountKind,
  DiscountStatus,
  DiscountValueType,
  UpdateDiscountPayload,
} from "@/api/discounts";
import { SidePanel, SidePanelFooter } from "@/Admin/ledger/SidePanel";
import { PLANS_PAGE_TITLE_ID } from "@/Admin/ledger/tabIds";
import { FIELD_CONTROL_CLASS, FormField } from "@/Admin/ledger/FormField";
import { LedgerButton, TextButton } from "@/Admin/ledger/LedgerButton";
import {
  toBogotaDateInputValue,
  toBogotaEndOfDay,
  toBogotaStartOfDay,
} from "@/Admin/bogotaDate";

interface DiscountFormState {
  kind: DiscountKind;
  planId: string;
  code: string;
  valueType: DiscountValueType;
  value: string;
  startsAt: string;
  endsAt: string;
  status: DiscountStatus;
}

function toFormState(discount: DiscountDto | null): DiscountFormState {
  if (!discount) {
    return {
      kind: "static",
      planId: "",
      code: "",
      valueType: "percentage",
      value: "",
      startsAt: "",
      endsAt: "",
      status: "active",
    };
  }
  return {
    kind: discount.kind,
    planId: discount.planId,
    code: discount.kind === "custom" ? discount.code : "",
    valueType: discount.valueType,
    // `fixed` is stored in cents (same convention as a plan's price) — shown to the admin in
    // pesos, same as PlanPanel's amount field; `percentage` is already the 1-99 the admin types.
    value:
      discount.valueType === "fixed"
        ? String(discount.value / 100)
        : String(discount.value),
    startsAt: toBogotaDateInputValue(discount.startsAt),
    endsAt: toBogotaDateInputValue(discount.endsAt),
    status: discount.status,
  };
}

function toValueInApiUnits(form: DiscountFormState): number {
  return form.valueType === "fixed"
    ? Math.round(Number(form.value) * 100)
    : Number(form.value);
}

// Only what the admin actually changed goes into the PATCH. `value` travels with a
// `valueType` change even if its text didn't move: the same "20" means cents for `fixed` and
// percent for `percentage`, so the BE has to re-validate it against the new type.
function buildUpdatePayload(
  form: DiscountFormState,
  initial: DiscountFormState,
): UpdateDiscountPayload {
  const payload: UpdateDiscountPayload = {};
  const valueTypeChanged = form.valueType !== initial.valueType;
  if (valueTypeChanged) payload.valueType = form.valueType;
  if (valueTypeChanged || form.value !== initial.value) {
    payload.value = toValueInApiUnits(form);
  }
  if (form.startsAt !== initial.startsAt) {
    payload.startsAt = toBogotaStartOfDay(form.startsAt);
  }
  if (form.endsAt !== initial.endsAt) {
    payload.endsAt = toBogotaEndOfDay(form.endsAt);
  }
  if (form.status !== initial.status) payload.status = form.status;
  return payload;
}

function toCreatePayload(form: DiscountFormState): CreateDiscountPayload {
  return {
    planId: form.planId,
    kind: form.kind,
    code: form.kind === "custom" ? form.code.trim() : undefined,
    valueType: form.valueType,
    value: toValueInApiUnits(form),
    startsAt: toBogotaStartOfDay(form.startsAt),
    endsAt: toBogotaEndOfDay(form.endsAt),
  };
}

// Native constraints (required/min/max) cover the per-field rules; this covers the one rule
// that spans two fields. "YYYY-MM-DD" strings compare correctly as plain strings.
function validateWindow(form: DiscountFormState): string | null {
  return form.startsAt && form.endsAt && form.endsAt < form.startsAt
    ? "La fecha de fin no puede ser anterior a la de inicio."
    : null;
}

const KIND_OPTIONS: { kind: DiscountKind; label: string }[] = [
  { kind: "static", label: "Automático" },
  { kind: "custom", label: "Con código" },
];

interface KindSelectorProps {
  value: DiscountKind;
  disabled: boolean;
  onChange: (kind: DiscountKind) => void;
}

// Figma segmented control: two equal buttons, the selected one filled with primary.
function KindSelector({ value, disabled, onChange }: KindSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        id="discount-kind-label"
        className="type-caption text-text-secondary"
      >
        Tipo
      </span>
      <div
        role="group"
        aria-labelledby="discount-kind-label"
        className="grid grid-cols-2 gap-2"
      >
        {KIND_OPTIONS.map((option) => {
          const selected = option.kind === value;
          return (
            <button
              key={option.kind}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(option.kind)}
              className={cn(
                "type-body-md-strong h-10 rounded-md border disabled:opacity-60",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-default text-text-primary",
              )}
              data-testid={`discount-kind-${option.kind}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DiscountPanelProps {
  // `null` = create mode.
  discount: DiscountDto | null;
  planName?: string;
  activePlans: PlanDto[];
  saving: boolean;
  saveError: string | null;
  onCreate: (payload: CreateDiscountPayload) => Promise<DiscountDto | null>;
  onUpdate: (
    discountId: string,
    payload: UpdateDiscountPayload,
  ) => Promise<DiscountDto | null>;
  onClose: () => void;
}

export function DiscountPanel({
  discount,
  planName,
  activePlans,
  saving,
  saveError,
  onCreate,
  onUpdate,
  onClose,
}: DiscountPanelProps) {
  const isEdit = discount !== null;
  const initialState = toFormState(discount);
  const [form, setForm] = useState<DiscountFormState>(initialState);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialState);

  function updateField<K extends keyof DiscountFormState>(
    key: K,
    value: DiscountFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  }

  function handleClose() {
    if (isDirty && !window.confirm("¿Descartar los cambios sin guardar?")) {
      return;
    }
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const windowError = validateWindow(form);
    if (windowError) {
      setValidationError(windowError);
      return;
    }

    if (!isEdit) {
      if (await onCreate(toCreatePayload(form))) onClose();
      return;
    }
    const changes = buildUpdatePayload(form, initialState);
    // Nothing changed: closing is the whole "save" — no request.
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    const result = await onUpdate(discount.discountId, changes);
    if (result) onClose();
  }

  const isPercentage = form.valueType === "percentage";

  return (
    <SidePanel
      title={isEdit ? "Editar descuento" : "Nuevo descuento"}
      titleId="discount-panel-title"
      onRequestClose={handleClose}
      fallbackFocusId={PLANS_PAGE_TITLE_ID}
      testId="discount-panel"
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-6"
        data-testid="discount-form"
      >
        <div className="flex flex-col gap-4">
          <KindSelector
            value={form.kind}
            disabled={isEdit}
            onChange={(kind) => updateField("kind", kind)}
          />

          <FormField label="Plan" htmlFor="discount-plan">
            {isEdit ? (
              <input
                id="discount-plan"
                type="text"
                disabled
                value={planName ?? form.planId}
                className={FIELD_CONTROL_CLASS}
                data-testid="discount-plan-readonly"
              />
            ) : (
              <select
                id="discount-plan"
                required
                value={form.planId}
                onChange={(e) => updateField("planId", e.target.value)}
                className={FIELD_CONTROL_CLASS}
                data-testid="discount-plan-select"
              >
                <option value="" disabled>
                  Elegí un plan
                </option>
                {activePlans.map((plan) => (
                  <option key={plan.planId} value={plan.planId}>
                    {plan.name}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {form.kind === "custom" && (
            <FormField
              label="Código"
              htmlFor="discount-code"
              hint="Entre 3 y 32 caracteres: letras, números, guion o guion bajo."
            >
              <input
                id="discount-code"
                type="text"
                required
                disabled={isEdit}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_\-]+"
                value={form.code}
                onChange={(e) =>
                  updateField("code", e.target.value.toUpperCase())
                }
                className={`${FIELD_CONTROL_CLASS} uppercase`}
                data-testid="discount-code-input"
              />
            </FormField>
          )}

          <FormField label="Tipo de valor" htmlFor="discount-value-type">
            <select
              id="discount-value-type"
              value={form.valueType}
              onChange={(e) =>
                updateField("valueType", e.target.value as DiscountValueType)
              }
              className={FIELD_CONTROL_CLASS}
              data-testid="discount-value-type-select"
            >
              <option value="percentage">Porcentaje</option>
              <option value="fixed">Monto fijo</option>
            </select>
          </FormField>

          <FormField
            label={isPercentage ? "Valor (1-99 %)" : "Valor (COP)"}
            htmlFor="discount-value"
          >
            <input
              id="discount-value"
              type="number"
              inputMode="numeric"
              min={1}
              max={isPercentage ? 99 : undefined}
              step={isPercentage ? 1 : "any"}
              required
              value={form.value}
              onChange={(e) => updateField("value", e.target.value)}
              className={FIELD_CONTROL_CLASS}
              data-testid="discount-value-input"
            />
          </FormField>

          <FormField label="Vigencia desde" htmlFor="discount-starts-at">
            <input
              id="discount-starts-at"
              type="date"
              required
              value={form.startsAt}
              onChange={(e) => updateField("startsAt", e.target.value)}
              className={FIELD_CONTROL_CLASS}
              data-testid="discount-starts-at-input"
            />
          </FormField>

          <FormField label="Vigencia hasta" htmlFor="discount-ends-at">
            <input
              id="discount-ends-at"
              type="date"
              required
              min={form.startsAt || undefined}
              value={form.endsAt}
              onChange={(e) => updateField("endsAt", e.target.value)}
              className={FIELD_CONTROL_CLASS}
              data-testid="discount-ends-at-input"
            />
          </FormField>

          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <span className="type-caption text-text-secondary">Estado</span>
              <div className="flex items-baseline justify-between gap-4">
                <span
                  className={`type-body-md ${form.status === "active" ? "text-primary" : "text-text-secondary"}`}
                  data-testid="discount-status-value"
                >
                  {form.status === "active" ? "Activo" : "Inactivo"}
                  {form.status !== discount.status && " (sin guardar)"}
                </span>
                <TextButton
                  onClick={() =>
                    updateField(
                      "status",
                      form.status === "active" ? "inactive" : "active",
                    )
                  }
                  data-testid="discount-status-toggle"
                >
                  {form.status === "active"
                    ? "Desactivar descuento"
                    : "Activar descuento"}
                </TextButton>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <SidePanelFooter
          error={validationError ?? saveError}
          errorTestId="discount-save-error"
        >
          <LedgerButton
            tone="secondary"
            onClick={handleClose}
            data-testid="discount-cancel-button"
          >
            Cancelar
          </LedgerButton>
          <LedgerButton
            type="submit"
            disabled={saving}
            data-testid="discount-save-button"
          >
            {saving ? "Guardando…" : "Guardar"}
          </LedgerButton>
        </SidePanelFooter>
      </form>
    </SidePanel>
  );
}
