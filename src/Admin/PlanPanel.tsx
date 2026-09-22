import { FormEvent, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, Button } from "@lila-care/design-system";
import {
  CreatePlanPayload,
  PlanDto,
  PlanStatus,
  UpdatePlanPayload,
} from "@/api/plans";

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
    setForm((prev) => ({
      ...prev,
      status: prev.status === "active" ? "inactive" : "active",
    }));
    setConfirmingDeactivation(false);
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

    const amountInCents = Math.round(Number(form.amountInPesos) * 100);
    const result = isEdit
      ? await onUpdate(plan.planId, {
          name: form.name,
          amountInCents,
          intervalDays: parseOptionalInt(form.intervalDays),
          maxInteractionsPerDay: parseOptionalInt(form.maxInteractionsPerDay),
          description: form.description || undefined,
          status: form.status,
        })
      : await onCreate({
          name: form.name,
          amountInCents,
          currency: "COP",
          intervalDays: parseOptionalInt(form.intervalDays),
          maxInteractionsPerDay: parseOptionalInt(form.maxInteractionsPerDay),
          description: form.description || undefined,
        });

    if (result) onClose();
  }

  const saveLabel =
    isDeactivating && confirmingDeactivation
      ? "¿Confirmar desactivación?"
      : saving
        ? "Guardando..."
        : "Guardar";

  return (
    <div
      className="w-[400px] shrink-0 border-l bg-white p-6"
      data-testid="plan-panel"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isEdit ? "Editar plan" : "Nuevo plan"}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          className="text-sm font-medium text-gray-600 hover:underline"
          data-testid="plan-panel-close"
        >
          Cerrar
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="plan-form"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="plan-name-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Precio (COP)
          </label>
          <input
            type="number"
            min={0}
            required
            value={form.amountInPesos}
            onChange={(e) => updateField("amountInPesos", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="plan-amount-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Ciclo de cobro (días, opcional)
          </label>
          <input
            type="number"
            min={1}
            value={form.intervalDays}
            onChange={(e) => updateField("intervalDays", e.target.value)}
            placeholder="Sin ciclo de cobro"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="plan-interval-days-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Límite de interacciones diarias (opcional)
          </label>
          <input
            type="number"
            min={1}
            value={form.maxInteractionsPerDay}
            onChange={(e) =>
              updateField("maxInteractionsPerDay", e.target.value)
            }
            placeholder="Ilimitado"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="plan-max-interactions-input"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Descripción (opcional)
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="plan-description-input"
          />
        </div>

        {isEdit && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.status === "active" ? "bg-primary" : "bg-gray-300"
              }`}
              aria-pressed={form.status === "active"}
              data-testid="plan-status-toggle"
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

        {isDeactivating && confirmingDeactivation && (
          <p
            className="text-sm text-amber-700"
            data-testid="plan-deactivate-warning"
          >
            Este plan dejará de estar disponible para nuevas suscripciones.
          </p>
        )}

        {saveError && (
          <Alert
            variant="destructive"
            className="rounded-xl border-red-200 bg-red-50 p-4"
            aria-live="polite"
            data-testid="plan-save-error"
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
          data-testid="plan-save-button"
        >
          {saveLabel}
        </Button>
      </form>
    </div>
  );
}
