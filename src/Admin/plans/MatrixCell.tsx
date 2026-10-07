import { EntitlementValue, FeatureDefinition, PlanDto } from "@/api/plans";
import { formatEntitlementValue } from "@/Admin/plans/entitlementsReductions";
import { cellText, isDefaultValue } from "@/Admin/plans/matrixFormat";

interface MatrixCellProps {
  plan: PlanDto;
  feature: FeatureDefinition;
  value: EntitlementValue;
  onSelect: (planId: string, featureKey: string) => void;
}

// One plan × feature cell. Announced ("Próximamente") features are plain muted text; the rest
// is a button that opens Editar plan on that feature. The "Por defecto" caption sits under
// values equal to the catalog default.
export function MatrixCell({
  plan,
  feature,
  value,
  onSelect,
}: MatrixCellProps) {
  if (!feature.enforced) {
    return (
      <span
        className="type-body-md text-text-secondary"
        data-testid={`matrix-cell-${plan.planId}-${feature.key}`}
      >
        <span className="sr-only">{`${feature.label}, ${plan.name}: `}</span>
        Próximamente
      </span>
    );
  }
  const label = `${feature.label}, ${plan.name}: ${formatEntitlementValue(feature, value)}. Editar plan`;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onSelect(plan.planId, feature.key)}
      className="flex min-w-0 flex-col items-start gap-0.5 text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      data-testid={`matrix-cell-${plan.planId}-${feature.key}`}
    >
      <span aria-hidden="true" className="type-body-md text-text-primary">
        {cellText(feature, value)}
      </span>
      {isDefaultValue(feature, value) && (
        <span
          aria-hidden="true"
          className="type-caption text-text-secondary"
          data-testid={`matrix-default-${plan.planId}-${feature.key}`}
        >
          Por defecto
        </span>
      )}
    </button>
  );
}
