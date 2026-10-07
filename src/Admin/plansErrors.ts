import { ApiError } from "@/api/http";
import { FeatureDefinition } from "@/api/plans";
import { formatCurrency } from "@/Admin/dashboardFormat";

// Mirrors WOMPI_MIN_AMOUNT_IN_CENTS in ms-lila src/subscription/discount.service.ts.
const WOMPI_MIN_AMOUNT_IN_CENTS = 150_000;

interface ErrorCopyRule {
  matches: (error: ApiError, message: string) => boolean;
  copy: string;
}

const includes = (fragment: string) => (_: ApiError, message: string) =>
  message.includes(fragment.toLowerCase());

// Keyed on the literal messages thrown by ms-lila (discount.service.ts, plan.service.ts,
// discount.dto.ts) — the BE text itself never reaches the admin.
const RULES: ErrorCopyRule[] = [
  {
    matches: (error, message) =>
      error.status === 409 && message.includes("overlaps"),
    copy: "Ya hay un descuento automático vigente para ese plan en esas fechas.",
  },
  {
    matches: includes("discount code already exists"),
    copy: "Ya existe un descuento con ese código.",
  },
  {
    matches: includes("fixed discount must be lower than the plan price"),
    copy: "El descuento debe ser menor al precio del plan.",
  },
  {
    matches: includes("below the minimum chargeable amount"),
    copy: `Con ese descuento el plan quedaría por debajo del mínimo que Wompi permite cobrar (${formatCurrency(WOMPI_MIN_AMOUNT_IN_CENTS)}).`,
  },
  {
    matches: includes("percentage discounts must be between"),
    copy: "El porcentaje debe estar entre 1 y 99.",
  },
  {
    matches: includes("code must match"),
    copy: "El código debe tener entre 3 y 32 caracteres: letras, números, guion o guion bajo.",
  },
  {
    matches: includes("endsat must be after startsat"),
    copy: "La fecha de fin debe ser posterior a la de inicio.",
  },
  {
    matches: includes("plan not found"),
    copy: "Ese plan ya no existe. Recargá la página.",
  },
  {
    matches: includes("discount not found"),
    copy: "Ese descuento ya no existe. Recargá la página.",
  },
  {
    matches: (error) => error.status === 401 || error.status === 403,
    copy: "No tenés permiso para hacer esto.",
  },
];

const FEATURES_FALLBACK = "Revisa los valores de las características.";

// Labels of the catalog features whose key appears in the BE's `errors[]` details.
function labelsInDetails(
  details: string[],
  catalog: FeatureDefinition[],
): string[] {
  const text = details.join(" ");
  const labels = catalog.filter((f) => text.includes(f.key)).map((f) => f.label);
  return [...new Set(labels)];
}

// Entitlement validation (400 { message, errors[] }): the BE text is English and technical, so
// it only goes to the console; the admin gets the offending characteristic when it can be
// identified, else a generic line.
function describeFeatureErrors(
  details: string[],
  catalog: FeatureDefinition[],
): string {
  console.warn("Plan features validation errors:", details);
  const labels = labelsInDetails(details, catalog);
  if (labels.length === 0) return FEATURES_FALLBACK;
  const quoted = labels.map((label) => `«${label}»`).join(", ");
  return labels.length === 1
    ? `Revisa el valor de ${quoted}: no es válido para este plan.`
    : `Revisa los valores de ${quoted}: no son válidos para este plan.`;
}

// Spanish copy for any error thrown by the plans/discounts/subscribers API calls. Anything
// unrecognized (network failure, 5xx, an unmapped validation message) gets `fallback`.
// `catalog` lets 400s about plan characteristics name the one that failed.
export function toPlansErrorMessage(
  error: unknown,
  fallback: string,
  catalog: FeatureDefinition[] = [],
): string {
  if (!(error instanceof ApiError)) return fallback;
  for (const message of error.messages.map((m) => m.toLowerCase())) {
    const rule = RULES.find((r) => r.matches(error, message));
    if (rule) return rule.copy;
  }
  if (error.status === 400 && error.details.length > 0) {
    return describeFeatureErrors(error.details, catalog);
  }
  const statusOnly = RULES.find((r) => r.matches(error, ""));
  return statusOnly?.copy ?? fallback;
}
