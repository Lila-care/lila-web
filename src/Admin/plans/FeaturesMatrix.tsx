import { CSSProperties } from "react";
import { FeatureDefinition, PlanDto } from "@/api/plans";
import { formatPlanStatus } from "@/Admin/plansFormat";
import { groupFeatures } from "@/Admin/plans/featureGroups";
import { MatrixCell } from "@/Admin/plans/MatrixCell";
import { featureSubtitle, planValue } from "@/Admin/plans/matrixFormat";

interface FeaturesMatrixProps {
  plans: PlanDto[];
  features: FeatureDefinition[];
  onSelect: (planId: string, featureKey: string) => void;
}

// Feature label column (2fr) + one equal column per plan, from `md`. Below `md` each row
// stacks: label, then the plans side by side with their name above each value (Figma 375).
const GRID = "grid gap-x-4 md:grid-cols-(--matrix-cols)";

function PlanHeading({ plan }: { plan: PlanDto }) {
  return (
    <span className="type-body-md-strong min-w-0 break-words text-primary">
      {plan.name}
      {plan.status !== "active" && (
        <span className="type-caption block font-normal text-text-secondary">
          {formatPlanStatus(plan.status)}
        </span>
      )}
    </span>
  );
}

function FeatureMatrixRow({
  feature,
  plans,
  onSelect,
}: { feature: FeatureDefinition } & Omit<FeaturesMatrixProps, "features">) {
  const muted = !feature.enforced;
  return (
    <li
      className={`${GRID} gap-y-3 border-b border-border-default py-4 ${muted ? "opacity-60" : ""}`}
      data-testid={`matrix-row-${feature.key}`}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="type-body-md-strong break-words text-text-primary">
          {feature.label}
        </span>
        <span className="type-body-sm text-text-secondary">
          {featureSubtitle(feature)}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-x-4 gap-y-3 md:contents">
        {plans.map((plan) => (
          <div key={plan.planId} className="flex min-w-0 flex-col gap-1">
            <span className="type-body-sm text-primary md:hidden">
              {plan.name}
            </span>
            <MatrixCell
              plan={plan}
              feature={feature}
              value={planValue(plan, feature)}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </li>
  );
}

// Plans × catalog, grouped by section. Columns = every plan the API returns (inactive ones
// are marked in their heading).
export function FeaturesMatrix({
  plans,
  features,
  onSelect,
}: FeaturesMatrixProps) {
  const style = {
    "--matrix-cols": `minmax(0,2fr) repeat(${plans.length}, minmax(0,1fr))`,
  } as CSSProperties;
  return (
    <div className="min-w-0" style={style} data-testid="features-matrix">
      <div
        className={`${GRID} hidden border-b border-border-default pb-3 md:grid`}
      >
        <span className="type-caption text-text-secondary">Característica</span>
        {plans.map((plan) => (
          <PlanHeading key={plan.planId} plan={plan} />
        ))}
      </div>
      {groupFeatures(features).map((group) => (
        <section
          key={group.id}
          aria-labelledby={`matrix-group-${group.id}`}
          data-testid={`matrix-group-${group.id}`}
        >
          <h2
            id={`matrix-group-${group.id}`}
            className="type-body-md-strong mt-6 border-b border-border-default pb-3 text-text-primary"
          >
            {group.title}
          </h2>
          <ul>
            {group.features.map((feature) => (
              <FeatureMatrixRow
                key={feature.key}
                feature={feature}
                plans={plans}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
