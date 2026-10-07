import { useCallback, useMemo, useState } from "react";
import { EntitlementMap, FeatureDefinition } from "@/api/plans";
import {
  EntitlementsDraft,
  FeatureDraft,
  buildBaselineDraft,
  collectChanges,
  defaultDraft,
  countModified,
  hasInvalidLimit,
  mergeDraft,
} from "@/Admin/plans/entitlementsDraft";
import { findReductions } from "@/Admin/plans/entitlementsReductions";

const NO_ENTITLEMENTS: EntitlementMap = {};

// Draft state of the "Características" section. The baseline is the saved plan (catalog
// defaults when creating); `edits` only holds the rows the admin touched, so a catalog that
// loads after the panel opens needs no re-initialisation. `unlocked` = rows at their default
// that the admin opened with "Personalizar".
export function useEntitlementsDraft(
  catalog: FeatureDefinition[],
  saved: EntitlementMap | undefined,
) {
  const baseline = useMemo(
    () => buildBaselineDraft(catalog, saved ?? NO_ENTITLEMENTS),
    [catalog, saved],
  );
  const [edits, setEdits] = useState<EntitlementsDraft>({});
  const [unlocked, setUnlocked] = useState<ReadonlySet<string>>(new Set());
  const draft = useMemo(() => mergeDraft(baseline, edits), [baseline, edits]);

  const customize = useCallback((key: string) => {
    setUnlocked((prev) => new Set(prev).add(key));
  }, []);

  // Editing a control keeps its row open even if the value lands back on the default.
  const setFeature = useCallback(
    (key: string, value: FeatureDraft) => {
      setEdits((prev) => ({ ...prev, [key]: value }));
      customize(key);
    },
    [customize],
  );

  const resetToDefault = useCallback(
    (feature: FeatureDefinition) => {
      setEdits((prev) => ({ ...prev, [feature.key]: defaultDraft(feature) }));
      setUnlocked((prev) => {
        const next = new Set(prev);
        next.delete(feature.key);
        return next;
      });
    },
    [],
  );

  return {
    baseline,
    draft,
    unlocked,
    setFeature,
    customize,
    resetToDefault,
    // Contract-shaped, only the keys that differ from the baseline.
    changes: collectChanges(catalog, baseline, draft),
    modifiedCount: countModified(catalog, baseline, draft),
    hasInvalid: hasInvalidLimit(catalog, draft),
    reductions: findReductions(catalog, baseline, draft),
  };
}
