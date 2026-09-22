import { FormEvent, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, Button } from "@lila-care/design-system";
import { PlanDto } from "@/api/plans";
import {
  CreateDiscountPayload,
  DiscountDto,
  DiscountKind,
  DiscountStatus,
  DiscountValueType,
  UpdateDiscountPayload,
} from "@/api/discounts";

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

// `startsAt`/`endsAt` are ISO timestamps in the BE contract; `<input type="date">` only
// speaks "YYYY-MM-DD" — this file is the only place that boundary gets crossed.
function toDateInputValue(isoString: string): string {
  return isoString.slice(0, 10);
}

function toStartOfDayIso(dateInputValue: string): string {
  return new Date(`${dateInputValue}T00:00:00.000Z`).toISOString();
}

function toEndOfDayIso(dateInputValue: string): string {
  return new Date(`${dateInputValue}T23:59:59.999Z`).toISOString();
}

function toFormState(discount: DiscountDto | null): DiscountFormState {
  if (!discount) {
    return {
      kind: "static",
      planId: "",
      code: "",
      valueType: "fixed",
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
    startsAt: toDateInputValue(discount.startsAt),
    endsAt: toDateInputValue(discount.endsAt),
    status: discount.status,
  };
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

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialState);

  function updateField<K extends keyof DiscountFormState>(
    key: K,
    value: DiscountFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    if (isDirty && !window.confirm("¿Descartar los cambios sin guardar?")) {
      return;
    }
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value =
      form.valueType === "fixed"
        ? Math.round(Number(form.value) * 100)
        : Number(form.value);

    const result = isEdit
      ? await onUpdate(discount.discountId, {
          value,
          valueType: form.valueType,
          startsAt: toStartOfDayIso(form.startsAt),
          endsAt: toEndOfDayIso(form.endsAt),
          status: form.status,
        })
      : await onCreate({
          planId: form.planId,
          kind: form.kind,
          code: form.kind === "custom" ? form.code : undefined,
          valueType: form.valueType,
          value,
          startsAt: toStartOfDayIso(form.startsAt),
          endsAt: toEndOfDayIso(form.endsAt),
        });

    if (result) onClose();
  }

  return (
    <div
      className="w-[400px] shrink-0 border-l bg-white p-6"
      data-testid="discount-panel"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEdit ? "Editar descuento" : "Nuevo descuento"}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="text-sm font-medium text-gray-600 hover:underline"
          data-testid="discount-panel-close"
        >
          Cerrar
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="discount-form"
      >
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Tipo
          </span>
          <div className="inline-flex rounded-lg border border-gray-300 p-1">
            <button
              type="button"
              disabled={isEdit}
              onClick={() => updateField("kind", "static")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                form.kind === "static"
                  ? "bg-primary text-white"
                  : "text-gray-600"
              }`}
              data-testid="discount-kind-static"
            >
              Automático
            </button>
            <button
              type="button"
              disabled={isEdit}
              onClick={() => updateField("kind", "custom")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                form.kind === "custom"
                  ? "bg-primary text-white"
                  : "text-gray-600"
              }`}
              data-testid="discount-kind-custom"
            >
              Con código
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Plan
          </label>
          {isEdit ? (
            <input
              type="text"
              disabled
              value={planName ?? form.planId}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              data-testid="discount-plan-readonly"
            />
          ) : (
            <select
              required
              value={form.planId}
              onChange={(e) => updateField("planId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="discount-plan-select"
            >
              <option value="" disabled>
                Selecciona un plan
              </option>
              {activePlans.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  {plan.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {form.kind === "custom" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Código
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={form.code}
              onChange={(e) =>
                updateField("code", e.target.value.toUpperCase())
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-500"
              data-testid="discount-code-input"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo de valor
            </label>
            <select
              value={form.valueType}
              onChange={(e) =>
                updateField("valueType", e.target.value as DiscountValueType)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="discount-value-type-select"
            >
              <option value="fixed">Fijo (COP)</option>
              <option value="percentage">Porcentaje</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Valor
            </label>
            <input
              type="number"
              min={form.valueType === "percentage" ? 1 : 0}
              max={form.valueType === "percentage" ? 99 : undefined}
              required
              value={form.value}
              onChange={(e) => updateField("value", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="discount-value-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Vigencia desde
            </label>
            <input
              type="date"
              required
              value={form.startsAt}
              onChange={(e) => updateField("startsAt", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="discount-starts-at-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Vigencia hasta
            </label>
            <input
              type="date"
              required
              value={form.endsAt}
              onChange={(e) => updateField("endsAt", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="discount-ends-at-input"
            />
          </div>
        </div>

        {isEdit && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                updateField(
                  "status",
                  form.status === "active" ? "inactive" : "active",
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.status === "active" ? "bg-primary" : "bg-gray-300"
              }`}
              aria-pressed={form.status === "active"}
              data-testid="discount-status-toggle"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.status === "active" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <label className="text-sm font-medium text-gray-700">
              {form.status === "active" ? "Activo" : "Inactivo"}
            </label>
          </div>
        )}

        {saveError && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-200 bg-red-50 p-4"
            aria-live="polite"
            data-testid="discount-save-error"
          >
            <AlertCircle className="size-4 text-red-700" aria-hidden="true" />
            <AlertDescription className="text-red-700">
              {saveError}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={saving}
          className="w-full"
          data-testid="discount-save-button"
        >
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
