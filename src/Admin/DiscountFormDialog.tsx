import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { AlertCircle, Loader2, X } from "lucide-react";
import type {
  CreateDiscountPayload,
  DiscountDto,
  UpdateDiscountPayload,
} from "@/api/discounts";
import type { PlanDto } from "@/api/plans";
import { DiscountFormFields } from "@/Admin/DiscountFormFields";
import { FIELD_IDS } from "@/Admin/discountFormControlUtils";
import {
  buildCreatePayload,
  buildPatchPayload,
  createInitialValues,
  FIELD_ORDER,
  interpretServerError,
  validateDiscountForm,
  valuesFromDiscount,
  type DiscountFormErrors,
  type DiscountFormField,
  type DiscountFormValues,
} from "@/Admin/discountForm";
import { todayInBogota } from "@/Admin/discountFormat";
import { Alert, AlertDescription, Button } from "@lila-care/design-system";

export interface DiscountFormDialogProps {
  // Present = edit that discount; absent = create a new one.
  editing?: DiscountDto;
  plans: PlanDto[];
  onCreate: (payload: CreateDiscountPayload) => Promise<void>;
  onUpdate: (
    discountId: string,
    payload: UpdateDiscountPayload,
  ) => Promise<void>;
  onClose: () => void;
}

function isEligiblePlan(plan: PlanDto): boolean {
  return plan.status === "active" && plan.amountInCents > 0;
}

function focusField(field: DiscountFormField) {
  document.getElementById(FIELD_IDS[field])?.focus();
}

// Mounted only while open (the parent conditionally renders it), so every open starts from a
// fresh state without needing an explicit reset effect.
export function DiscountFormDialog({
  editing,
  plans,
  onCreate,
  onUpdate,
  onClose,
}: DiscountFormDialogProps) {
  const mode = editing ? "edit" : "create";
  const [values, setValues] = useState<DiscountFormValues>(() =>
    editing ? valuesFromDiscount(editing) : createInitialValues(),
  );
  const [touched, setTouched] = useState<Set<DiscountFormField>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<DiscountFormErrors>({});
  const [serverSummary, setServerSummary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const selectedPlan = plans.find((p) => p.planId === values.planId) ?? null;
  const eligiblePlans = useMemo(() => plans.filter(isEligiblePlan), [plans]);
  const today = todayInBogota();

  const clientErrors = validateDiscountForm(values, {
    mode,
    planPriceInCents: selectedPlan?.amountInCents ?? null,
    today,
  });

  // Errors appear per field after it was touched, or for all fields once a submit was attempted.
  const visibleErrors: DiscountFormErrors = {};
  for (const field of FIELD_ORDER) {
    const message =
      serverErrors[field] ??
      (submitted || touched.has(field) ? clientErrors[field] : undefined);
    if (message) visibleErrors[field] = message;
  }

  useEffect(() => {
    if (serverSummary.length > 0) summaryRef.current?.focus();
  }, [serverSummary]);

  const handleChange = <F extends DiscountFormField>(
    field: F,
    value: DiscountFormValues[F],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleBlur = (field: DiscountFormField) =>
    setTouched((prev) => new Set(prev).add(field));

  const save = async () => {
    if (editing) {
      const patch = buildPatchPayload(values, editing);
      // Nothing changed: closing is the honest outcome, no request needed.
      if (Object.keys(patch).length === 0) return;
      await onUpdate(editing.discountId, patch);
      return;
    }
    await onCreate(buildCreatePayload(values));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((f) => clientErrors[f]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    setSaving(true);
    setServerSummary([]);
    setServerErrors({});
    try {
      await save();
      onClose();
    } catch (error) {
      const outcome = interpretServerError(error, values, mode);
      setServerErrors(outcome.fieldErrors);
      setServerSummary(outcome.summary);
      const focusTarget = FIELD_ORDER.find((f) => outcome.fieldErrors[f]);
      if (focusTarget && outcome.summary.length === 0) focusField(focusTarget);
      setSaving(false);
    }
  };

  const title = editing ? "Editar descuento" : "Nuevo descuento";
  const submitLabel = editing ? "Guardar cambios" : "Crear descuento";
  const savingLabel = editing ? "Guardando…" : "Creando…";

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          data-testid="discount-form-dialog"
          // Clicking the overlay must not discard typed data; Escape and Cancel still close.
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (saving) e.preventDefault();
          }}
          className="fixed inset-0 z-50 flex h-dvh flex-col bg-background outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:shadow-xl"
        >
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex flex-col gap-1 p-6 pb-2">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral-600">
                Define cómo y cuándo se aplica el descuento.
              </Dialog.Description>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {serverSummary.length > 0 && (
                <div
                  ref={summaryRef}
                  tabIndex={-1}
                  data-testid="discount-form-error"
                  className="mb-4 outline-none"
                >
                  <Alert
                    variant="destructive"
                    className="rounded-xl border-red-200 bg-red-50 p-4"
                  >
                    <AlertCircle aria-hidden="true" />
                    <AlertDescription className="text-red-700">
                      {serverSummary.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <DiscountFormFields
                mode={mode}
                values={values}
                errors={visibleErrors}
                eligiblePlans={eligiblePlans}
                editing={editing}
                selectedPlan={selectedPlan}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border p-6 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                disabled={saving}
                onClick={onClose}
                data-testid="discount-form-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto"
                disabled={
                  saving || (mode === "create" && eligiblePlans.length === 0)
                }
                aria-busy={saving}
                data-testid="discount-form-submit"
              >
                {saving && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {saving ? savingLabel : submitLabel}
              </Button>
            </div>
          </form>
          {/* Last in the DOM so the first Tab stop is the first field, not the close icon. */}
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-4 right-4"
              aria-label="Cerrar"
              disabled={saving}
            >
              <X aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
