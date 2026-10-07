import {
  EntitlementMap,
  EntitlementValue,
  FeatureDefinition,
} from "@/api/plans";

// Editing state of one limit row. `raw` is the text in the input (kept as text so "" and
// half-typed values are representable); `unlimited` maps to `null` in the contract.
export interface LimitDraft {
  unlimited: boolean;
  raw: string;
}

export type FeatureDraft = boolean | LimitDraft;

export type EntitlementsDraft = Record<string, FeatureDraft>;

export const LIMIT_NOT_INTEGER = "Debe ser un número entero.";
export const LIMIT_NEGATIVE = "No puede ser negativo.";
export const LIMIT_TOO_LARGE = "Valor demasiado grande.";

// Features the admin can actually change; `enforced: false` ones are announced only.
export function isEditable(feature: FeatureDefinition): boolean {
  return feature.enforced;
}

// The value a feature currently has in a plan: the saved one, else the catalog default.
function resolveSaved(
  feature: FeatureDefinition,
  saved: EntitlementMap,
): EntitlementValue {
  return feature.key in saved ? saved[feature.key] : feature.default;
}

function toDraft(feature: FeatureDefinition, value: EntitlementValue): FeatureDraft {
  if (feature.type === "flag") return value === true;
  return typeof value === "number"
    ? { unlimited: false, raw: String(value) }
    : { unlimited: true, raw: "" };
}

// Draft equivalent to the saved plan (or to the catalog defaults when creating).
export function buildBaselineDraft(
  catalog: FeatureDefinition[],
  saved: EntitlementMap,
): EntitlementsDraft {
  return Object.fromEntries(
    catalog.map((f) => [f.key, toDraft(f, resolveSaved(f, saved))]),
  );
}

// Empty input (or "Ilimitado") = unlimited; otherwise the text must be a non-negative integer.
export function validateLimit(draft: LimitDraft): string | null {
  const raw = draft.raw.trim();
  if (draft.unlimited || raw === "") return null;
  if (/^-\d+([.,]\d+)?$/.test(raw)) return LIMIT_NEGATIVE;
  if (!/^\d+$/.test(raw)) return LIMIT_NOT_INTEGER;
  return Number.isSafeInteger(Number(raw)) ? null : LIMIT_TOO_LARGE;
}

// Contract value of a draft; `undefined` while a limit input is invalid.
export function draftToValue(
  draft: FeatureDraft,
): EntitlementValue | undefined {
  if (typeof draft === "boolean") return draft;
  if (draft.unlimited || draft.raw.trim() === "") return null;
  return validateLimit(draft) === null ? Number(draft.raw.trim()) : undefined;
}

// The catalog default as a draft: what "Usar valor por defecto" restores.
export function defaultDraft(feature: FeatureDefinition): FeatureDraft {
  return toDraft(feature, feature.default);
}

// The BE returns plan maps with defaults already resolved, so "por defecto" is simply
// value === catalog default (an explicit override equal to the default is indistinguishable).
export function isAtDefault(
  feature: FeatureDefinition,
  draft: FeatureDraft,
): boolean {
  const value = draftToValue(draft);
  return feature.type === "flag"
    ? value === (feature.default === true)
    : value === feature.default;
}

// `edits` holds only the rows the admin touched; everything else follows the baseline.
export function mergeDraft(
  baseline: EntitlementsDraft,
  edits: EntitlementsDraft,
): EntitlementsDraft {
  return { ...baseline, ...edits };
}

export function isModified(
  key: string,
  baseline: EntitlementsDraft,
  draft: EntitlementsDraft,
): boolean {
  return (
    key in draft &&
    draftToValue(baseline[key]) !== draftToValue(draft[key])
  );
}

export function countModified(
  catalog: FeatureDefinition[],
  baseline: EntitlementsDraft,
  draft: EntitlementsDraft,
): number {
  return catalog.filter(
    (f) => isEditable(f) && isModified(f.key, baseline, draft),
  ).length;
}

export function hasInvalidLimit(
  catalog: FeatureDefinition[],
  draft: EntitlementsDraft,
): boolean {
  return catalog.some((f) => {
    const value = draft[f.key];
    return (
      isEditable(f) &&
      typeof value === "object" &&
      validateLimit(value) !== null
    );
  });
}

// Only the keys that differ from the baseline, in contract shape — what PATCH (and create)
// send. Invalid limits are skipped; submit is blocked while any exists (hasInvalidLimit).
export function collectChanges(
  catalog: FeatureDefinition[],
  baseline: EntitlementsDraft,
  draft: EntitlementsDraft,
): EntitlementMap {
  const changes: EntitlementMap = {};
  for (const feature of catalog) {
    if (!isEditable(feature) || !isModified(feature.key, baseline, draft)) {
      continue;
    }
    const value = draftToValue(draft[feature.key]);
    if (value !== undefined) changes[feature.key] = value;
  }
  return changes;
}
