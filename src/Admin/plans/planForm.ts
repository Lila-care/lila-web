import { PlanDto, PlanStatus } from "@/api/plans";

export interface PlanFormState {
  name: string;
  amountInPesos: string;
  intervalDays: string;
  description: string;
  status: PlanStatus;
}

export function toFormState(plan: PlanDto | null): PlanFormState {
  if (!plan) {
    return {
      name: "",
      amountInPesos: "",
      intervalDays: "",
      description: "",
      status: "active",
    };
  }
  return {
    name: plan.name,
    amountInPesos: String(plan.amountInCents / 100),
    intervalDays: plan.intervalDays === null ? "" : String(plan.intervalDays),
    description: plan.description ?? "",
    status: plan.status,
  };
}

// "" (left blank) maps to `null` (no billing cycle), matching the BE contract.
function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function toPayloadFields(form: PlanFormState) {
  return {
    name: form.name.trim(),
    amountInCents: Math.round(Number(form.amountInPesos) * 100),
    intervalDays: parseOptionalInt(form.intervalDays),
  };
}
