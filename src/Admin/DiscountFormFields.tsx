import { Lock } from "lucide-react";
import type { DiscountDto, DiscountKind } from "@/api/discounts";
import type { PlanDto } from "@/api/plans";
import {
  FieldError,
  Fieldset,
  FieldShell,
  RadioOption,
  RequiredMark,
} from "@/Admin/DiscountFormControls";
import {
  CONTROL_BORDER,
  describedBy,
  errorId,
  FIELD_IDS,
  helpId,
  INPUT_CLASS,
} from "@/Admin/discountFormControlUtils";
import { formatCop } from "@/Admin/discountFormat";
import {
  getPreviewPrice,
  type DiscountFormErrors,
  type DiscountFormField,
  type DiscountFormValues,
} from "@/Admin/discountForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lila-care/design-system";
import { cn } from "@/lib/utils";

export interface DiscountFormFieldsProps {
  mode: "create" | "edit";
  values: DiscountFormValues;
  errors: DiscountFormErrors;
  // Plans the admin may pick in create mode (active and with a price).
  eligiblePlans: PlanDto[];
  // The discount being edited (edit mode only) — feeds the read-only summary.
  editing?: DiscountDto;
  selectedPlan: PlanDto | null;
  onChange: <F extends DiscountFormField>(
    field: F,
    value: DiscountFormValues[F],
  ) => void;
  onBlur: (field: DiscountFormField) => void;
}

function LockedSummary({
  discount,
  planName,
}: {
  discount: DiscountDto;
  planName: string;
}) {
  return (
    <div
      data-testid="discount-locked-summary"
      className="rounded-lg bg-muted p-3"
    >
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Lock className="size-3.5" aria-hidden="true" />
            Plan
          </dt>
          <dd className="text-neutral-900">{planName}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Lock className="size-3.5" aria-hidden="true" />
            Tipo
          </dt>
          <dd className="text-neutral-900">
            {discount.kind === "static" ? "Automático" : "Código"}
          </dd>
        </div>
        {discount.kind === "custom" && (
          <div className="sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Lock className="size-3.5" aria-hidden="true" />
              Código
            </dt>
            <dd className="font-mono break-all text-neutral-900">
              {discount.code}
            </dd>
          </div>
        )}
      </dl>
      <p className="mt-2 text-xs text-neutral-600">
        El plan, el tipo y el código no se pueden cambiar para conservar el
        historial de compras.
      </p>
    </div>
  );
}

function PlanField({
  values,
  errors,
  eligiblePlans,
  onChange,
}: Pick<
  DiscountFormFieldsProps,
  "values" | "errors" | "eligiblePlans" | "onChange"
>) {
  const id = FIELD_IDS.planId;
  const noEligiblePlans = eligiblePlans.length === 0;
  const error = errors.planId;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        Plan
        <RequiredMark />
      </label>
      <Select
        value={values.planId}
        onValueChange={(planId) => onChange("planId", planId)}
        disabled={noEligiblePlans}
      >
        <SelectTrigger
          id={id}
          className="w-full border-border! aria-invalid:border-destructive!"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, false, Boolean(error))}
          data-testid="discount-plan-select"
        >
          <SelectValue
            placeholder={
              noEligiblePlans
                ? "No hay planes con precio para descontar."
                : "Selecciona un plan"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {eligiblePlans.map((plan) => (
            <SelectItem key={plan.planId} value={plan.planId}>
              {plan.name} — {formatCop(plan.amountInCents)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <FieldError id={id} message={error} />}
    </div>
  );
}

function KindField({
  value,
  onChange,
}: {
  value: DiscountKind;
  onChange: DiscountFormFieldsProps["onChange"];
}) {
  return (
    <Fieldset legend="Tipo de descuento">
      <RadioOption
        name="discount-kind"
        value="static"
        checked={value === "static"}
        label="Automático"
        description="Se aplica solo a todas las compras del plan durante la vigencia. La usuaria no ingresa nada."
        onChange={() => onChange("kind", "static")}
      />
      <RadioOption
        name="discount-kind"
        value="custom"
        checked={value === "custom"}
        label="Código"
        description="Solo aplica si la usuaria ingresa el código al pagar."
        onChange={() => onChange("kind", "custom")}
      />
    </Fieldset>
  );
}

function ValueField({
  values,
  errors,
  selectedPlan,
  onChange,
  onBlur,
}: Pick<
  DiscountFormFieldsProps,
  "values" | "errors" | "selectedPlan" | "onChange" | "onBlur"
>) {
  const id = FIELD_IDS.value;
  const isFixed = values.valueType === "fixed";
  const error = errors.value;
  const previewPrice = getPreviewPrice(
    values,
    selectedPlan?.amountInCents ?? null,
  );
  const help = isFixed ? "Menor al precio del plan" : "Entero entre 1 y 99";
  const describedIds = [
    helpId(id),
    error ? errorId(id) : null,
    previewPrice !== null ? `${id}-preview` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {isFixed ? "Valor (COP)" : "Valor (%)"}
        <RequiredMark />
      </label>
      <div
        className={cn(
          "flex h-9 items-center rounded-md bg-background px-3 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          CONTROL_BORDER,
          error && "border-destructive",
        )}
      >
        {isFixed && (
          <span aria-hidden="true" className="pr-1 text-sm text-neutral-600">
            $
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={values.value}
          onChange={(e) => onChange("value", e.target.value.replace(/\D/g, ""))}
          onBlur={() => onBlur("value")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedIds}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none"
        />
        {!isFixed && (
          <span aria-hidden="true" className="pl-1 text-sm text-neutral-600">
            %
          </span>
        )}
      </div>
      <p id={helpId(id)} className="text-xs text-neutral-600">
        {help}
      </p>
      {error && <FieldError id={id} message={error} />}
      {previewPrice !== null && selectedPlan && (
        <p
          id={`${id}-preview`}
          data-testid="discount-price-preview"
          className="rounded-lg bg-muted p-3 text-sm text-neutral-600"
        >
          Precio lista {formatCop(selectedPlan.amountInCents)} → con descuento{" "}
          <strong className="text-neutral-900">
            {formatCop(previewPrice)}
          </strong>
        </p>
      )}
    </div>
  );
}

function ValidityFields({
  values,
  errors,
  onChange,
  onBlur,
}: Pick<DiscountFormFieldsProps, "values" | "errors" | "onChange" | "onBlur">) {
  return (
    <Fieldset legend="Vigencia (hora de Colombia)">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FieldShell
          id={FIELD_IDS.startsDate}
          label="Inicia"
          required
          error={errors.startsDate}
        >
          <input
            id={FIELD_IDS.startsDate}
            type="date"
            value={values.startsDate}
            onChange={(e) => onChange("startsDate", e.target.value)}
            onBlur={() => onBlur("startsDate")}
            aria-invalid={errors.startsDate ? true : undefined}
            aria-describedby={describedBy(
              FIELD_IDS.startsDate,
              false,
              Boolean(errors.startsDate),
            )}
            className={INPUT_CLASS}
          />
        </FieldShell>
        <FieldShell
          id={FIELD_IDS.endsDate}
          label="Termina"
          required
          help="El descuento termina al final de este día."
          error={errors.endsDate}
        >
          <input
            id={FIELD_IDS.endsDate}
            type="date"
            min={values.startsDate || undefined}
            value={values.endsDate}
            onChange={(e) => onChange("endsDate", e.target.value)}
            onBlur={() => onBlur("endsDate")}
            aria-invalid={errors.endsDate ? true : undefined}
            aria-describedby={describedBy(
              FIELD_IDS.endsDate,
              true,
              Boolean(errors.endsDate),
            )}
            className={INPUT_CLASS}
          />
        </FieldShell>
      </div>
    </Fieldset>
  );
}

export function DiscountFormFields(props: DiscountFormFieldsProps) {
  const { mode, values, errors, eligiblePlans, editing, selectedPlan } = props;
  const { onChange, onBlur } = props;
  return (
    <div className="flex flex-col gap-5">
      {mode === "edit" && editing && (
        <LockedSummary
          discount={editing}
          planName={selectedPlan?.name ?? editing.planId}
        />
      )}
      {mode === "create" && (
        <>
          <PlanField
            values={values}
            errors={errors}
            eligiblePlans={eligiblePlans}
            onChange={onChange}
          />
          <KindField value={values.kind} onChange={onChange} />
          {values.kind === "custom" && (
            <FieldShell
              id={FIELD_IDS.code}
              label="Código"
              required
              help="3 a 32 caracteres: letras, números, guion (-) y guion bajo (_). No distingue mayúsculas."
              error={errors.code}
            >
              <input
                id={FIELD_IDS.code}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={values.code}
                onChange={(e) => onChange("code", e.target.value.toUpperCase())}
                onBlur={() => onBlur("code")}
                aria-invalid={errors.code ? true : undefined}
                aria-describedby={describedBy(
                  FIELD_IDS.code,
                  true,
                  Boolean(errors.code),
                )}
                className={cn(INPUT_CLASS, "font-mono")}
              />
            </FieldShell>
          )}
        </>
      )}
      <Fieldset legend="Tipo de valor">
        <RadioOption
          name="discount-value-type"
          value="fixed"
          checked={values.valueType === "fixed"}
          label="Monto fijo (COP)"
          onChange={() => onChange("valueType", "fixed")}
        />
        <RadioOption
          name="discount-value-type"
          value="percentage"
          checked={values.valueType === "percentage"}
          label="Porcentaje"
          onChange={() => onChange("valueType", "percentage")}
        />
      </Fieldset>
      <ValueField
        values={values}
        errors={errors}
        selectedPlan={selectedPlan}
        onChange={onChange}
        onBlur={onBlur}
      />
      <ValidityFields
        values={values}
        errors={errors}
        onChange={onChange}
        onBlur={onBlur}
      />
    </div>
  );
}
