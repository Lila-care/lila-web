import { FIELD_CONTROL_CLASS, FormField } from "@/Admin/ledger/FormField";
import { PlanFormState } from "@/Admin/plans/planForm";

interface PlanBasicFieldsProps {
  form: PlanFormState;
  onChange: <K extends keyof PlanFormState>(
    key: K,
    value: PlanFormState[K],
  ) => void;
}

// Nombre / Precio + Ciclo (2 columns) / Descripción — the status switch lives in the panel.
export function PlanBasicFields({ form, onChange }: PlanBasicFieldsProps) {
  return (
    <>
      <FormField label="Nombre" htmlFor="plan-name">
        <input
          id="plan-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          className={FIELD_CONTROL_CLASS}
          data-testid="plan-name-input"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Precio (COP)" htmlFor="plan-amount">
          <input
            id="plan-amount"
            type="number"
            inputMode="numeric"
            min={0}
            step="any"
            required
            value={form.amountInPesos}
            onChange={(e) => onChange("amountInPesos", e.target.value)}
            className={FIELD_CONTROL_CLASS}
            data-testid="plan-amount-input"
          />
        </FormField>
        <FormField label="Ciclo de cobro (días)" htmlFor="plan-interval-days">
          <input
            id="plan-interval-days"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={form.intervalDays}
            onChange={(e) => onChange("intervalDays", e.target.value)}
            placeholder="Sin ciclo de cobro"
            className={FIELD_CONTROL_CLASS}
            data-testid="plan-interval-days-input"
          />
        </FormField>
      </div>

      <FormField label="Descripción (opcional)" htmlFor="plan-description">
        <textarea
          id="plan-description"
          rows={2}
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          className={`${FIELD_CONTROL_CLASS} resize-y`}
          data-testid="plan-description-input"
        />
      </FormField>
    </>
  );
}
