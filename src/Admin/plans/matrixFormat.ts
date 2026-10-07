import { EntitlementValue, FeatureDefinition, PlanDto } from "@/api/plans";
import { UNIT_LABEL } from "@/Admin/plans/featureLabels";

// The plan's value for a feature. The BE sends the map with defaults already resolved; a key
// that is somehow absent is read as the catalog default.
export function planValue(
  plan: PlanDto,
  feature: FeatureDefinition,
): EntitlementValue {
  const map = plan.entitlements ?? {};
  return feature.key in map ? map[feature.key] : feature.default;
}

// Assumption (documented in CLAUDE.md): "Por defecto" = the resolved value equals the catalog
// default; an explicit override equal to the default can't be told apart.
export function isDefaultValue(
  feature: FeatureDefinition,
  value: EntitlementValue,
): boolean {
  return feature.type === "flag"
    ? (value === true) === (feature.default === true)
    : value === feature.default;
}

// Visible cell text: ✓ / — for flags; number / Ilimitado / Bloqueado for limits.
export function cellText(
  feature: FeatureDefinition,
  value: EntitlementValue,
): string {
  if (feature.type === "flag") return value === true ? "✓" : "—";
  if (value === null) return "Ilimitado";
  return value === 0 ? "Bloqueado" : String(value);
}

// Row subtitle: the unit for limits, "Activo / Inactivo" for flags.
export function featureSubtitle(feature: FeatureDefinition): string {
  if (feature.type === "flag") return "Activo / Inactivo";
  return feature.unit ? UNIT_LABEL[feature.unit] : "";
}
