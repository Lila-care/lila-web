import { FeatureDefinition } from "@/api/plans";
import { PlanFeaturesState } from "@/Admin/usePlanFeatures";
import { LedgerError } from "@/Admin/ledger/LedgerError";
import { LedgerSkeleton } from "@/Admin/ledger/LedgerSkeleton";
import {
  EntitlementsDraft,
  FeatureDraft,
  isAtDefault,
  isModified,
} from "@/Admin/plans/entitlementsDraft";
import { FeatureRow } from "@/Admin/plans/FeatureRow";
import { groupFeatures } from "@/Admin/plans/featureGroups";

interface EntitlementsSectionProps {
  catalog: PlanFeaturesState;
  baseline: EntitlementsDraft;
  draft: EntitlementsDraft;
  unlocked: ReadonlySet<string>;
  onChange: (key: string, draft: FeatureDraft) => void;
  onCustomize: (key: string) => void;
  onReset: (feature: FeatureDefinition) => void;
}

// "Características" of the plan panel: the 4 states of the catalog (loading / error with retry
// / empty / loaded) around the grouped rows.
export function EntitlementsSection({
  catalog,
  baseline,
  draft,
  unlocked,
  onChange,
  onCustomize,
  onReset,
}: EntitlementsSectionProps) {
  return (
    <section
      aria-labelledby="plan-features-title"
      className="flex flex-col gap-2"
      data-testid="plan-features"
    >
      <h3
        id="plan-features-title"
        className="type-body-lg-strong text-text-primary"
      >
        Características
      </h3>
      <p className="type-body-sm text-text-secondary">
        Vacío = Ilimitado · 0 = Bloqueado. Los valores ausentes usan el catálogo.
        Guardar aplica de inmediato.
      </p>
      {catalog.loading && (
        <LedgerSkeleton rows={4} testId="plan-features-loading" />
      )}
      {!catalog.loading && catalog.error && (
        <LedgerError
          message="No pudimos cargar las características."
          detail={catalog.error}
          onRetry={catalog.refetch}
          testId="plan-features-error"
        />
      )}
      {!catalog.loading && !catalog.error && catalog.features.length === 0 && (
        <p
          className="type-body-sm text-text-secondary"
          data-testid="plan-features-empty"
        >
          Todavía no hay características configurables.
        </p>
      )}
      {!catalog.loading &&
        !catalog.error &&
        groupFeatures(catalog.features).map((group) => (
          <div
            key={group.id}
            className="flex flex-col"
            data-testid={`feature-group-${group.id}`}
          >
            <h4 className="type-body-md-strong mt-4 border-b border-border-default pb-2 text-text-primary">
              {group.title}
            </h4>
            <ul className="flex flex-col">
              {group.features.map((feature) => {
                const atDefault = isAtDefault(feature, draft[feature.key]);
                return (
                  <FeatureRow
                    key={feature.key}
                    feature={feature}
                    draft={draft[feature.key]}
                    modified={isModified(feature.key, baseline, draft)}
                    atDefault={atDefault}
                    locked={atDefault && !unlocked.has(feature.key)}
                    onChange={(next) => onChange(feature.key, next)}
                    onCustomize={() => onCustomize(feature.key)}
                    onReset={() => onReset(feature)}
                  />
                );
              })}
            </ul>
          </div>
        ))}
    </section>
  );
}
