import { EntitlementValue, FeatureDefinition } from "@/api/plans";
import {
  EntitlementsDraft,
  draftToValue,
  isEditable,
} from "@/Admin/plans/entitlementsDraft";
import { UNIT_LABEL } from "@/Admin/plans/featureLabels";

export interface Reduction {
  key: string;
  label: string;
  before: string;
  after: string;
}

// "Activo" / "Inactivo" / "Ilimitado" / "Bloqueado" / "30 por día" / "90 días".
export function formatEntitlementValue(
  feature: FeatureDefinition,
  value: EntitlementValue,
): string {
  if (feature.type === "flag") return value === true ? "Activo" : "Inactivo";
  if (value === null) return "Ilimitado";
  if (value === 0) return "Bloqueado";
  return feature.unit ? `${value} ${UNIT_LABEL[feature.unit]}` : String(value);
}

// Less access: a flag turned off, or a limit that goes from unlimited to a number or to a
// lower number (0 included).
function reducesAccess(
  before: EntitlementValue,
  after: EntitlementValue,
): boolean {
  if (typeof before === "boolean" || typeof after === "boolean") {
    return before === true && after === false;
  }
  if (after === null) return false;
  return before === null || after < before;
}

// Changed features whose new value gives less access than the saved one — the ones that need
// the "Confirmar cambio" step when the plan has subscribers.
export function findReductions(
  catalog: FeatureDefinition[],
  baseline: EntitlementsDraft,
  draft: EntitlementsDraft,
): Reduction[] {
  return catalog.flatMap((feature) => {
    if (!isEditable(feature)) return [];
    const before = draftToValue(baseline[feature.key]);
    const after = draftToValue(draft[feature.key]);
    if (before === undefined || after === undefined) return [];
    if (!reducesAccess(before, after)) return [];
    return [
      {
        key: feature.key,
        label: feature.label,
        before: formatEntitlementValue(feature, before),
        after: formatEntitlementValue(feature, after),
      },
    ];
  });
}
