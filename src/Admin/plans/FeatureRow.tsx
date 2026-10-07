import { FeatureDefinition } from "@/api/plans";
import { TextButton } from "@/Admin/ledger/LedgerButton";
import { FeatureDraft } from "@/Admin/plans/entitlementsDraft";
import { LimitControl } from "@/Admin/plans/LimitControl";
import { ToggleSwitch } from "@/Admin/plans/ToggleSwitch";

export interface FeatureRowProps {
  feature: FeatureDefinition;
  draft: FeatureDraft;
  modified: boolean;
  // Value equals the catalog default and the admin hasn't pressed "Personalizar".
  locked: boolean;
  atDefault: boolean;
  onChange: (draft: FeatureDraft) => void;
  onCustomize: () => void;
  onReset: () => void;
}

const MODIFIED_CLASS = "type-body-sm text-primary";

function FeatureControl({
  feature,
  draft,
  modified,
  disabled,
  onChange,
}: Pick<FeatureRowProps, "feature" | "draft" | "modified" | "onChange"> & {
  disabled: boolean;
}) {
  if (typeof draft !== "boolean") {
    return (
      <LimitControl
        feature={feature}
        draft={draft}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  const labelId = `feature-label-${feature.key}`;
  return (
    <div className="flex items-center gap-3">
      <ToggleSwitch
        checked={draft}
        onChange={onChange}
        labelledBy={labelId}
        disabled={disabled}
        testId={`feature-switch-${feature.key}`}
        controlKey={feature.key}
      />
      <span className="type-body-sm text-text-primary">
        {draft ? "Activo" : "Inactivo"}
      </span>
      {modified && (
        <span
          className={MODIFIED_CLASS}
          data-testid={`feature-modified-${feature.key}`}
        >
          Modificado
        </span>
      )}
    </div>
  );
}

function FeatureStatusLine({
  feature,
  draft,
  modified,
  locked,
  atDefault,
  onCustomize,
  onReset,
}: FeatureRowProps) {
  const { key } = feature;
  if (!feature.enforced) {
    return <span className="type-body-sm text-text-secondary">Próximamente</span>;
  }
  if (locked) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-body-sm text-text-secondary">
          Por defecto
          {modified && (
            <span
              className={`${MODIFIED_CLASS} ml-2`}
              data-testid={`feature-modified-${key}`}
            >
              Modificado
            </span>
          )}
        </span>
        <TextButton
          onClick={onCustomize}
          className="type-body-sm"
          data-testid={`feature-customize-${key}`}
        >
          Personalizar
        </TextButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {modified && typeof draft !== "boolean" && (
        <span
          className={MODIFIED_CLASS}
          data-testid={`feature-modified-${key}`}
        >
          Modificado
        </span>
      )}
      {!atDefault && (
        <TextButton
          onClick={onReset}
          className="type-body-sm"
          data-testid={`feature-reset-${key}`}
        >
          Usar valor por defecto
        </TextButton>
      )}
    </div>
  );
}

// One characteristic of the plan panel: label, short description, control and a status line
// (Por defecto / Personalizar, Modificado / Usar valor por defecto, Próximamente). Flat row
// separated by a hairline. Focusable (tabIndex -1) so the matrix can land on it.
export function FeatureRow(props: FeatureRowProps) {
  const { feature, draft, modified, locked, onChange } = props;
  return (
    <li
      tabIndex={-1}
      data-feature-row={feature.key}
      className={`flex flex-col gap-2 border-b border-border-default py-4 last:border-b-0 focus:outline-none ${
        feature.enforced ? "" : "opacity-60"
      }`}
      data-testid={`feature-row-${feature.key}`}
    >
      <div className="flex flex-col gap-0.5">
        <span
          id={`feature-label-${feature.key}`}
          className="type-body-md-strong break-words text-text-primary"
        >
          {feature.label}
        </span>
        <span className="type-body-sm break-words text-text-secondary">
          {feature.description}
        </span>
      </div>
      {/* Announced features have no real value yet: only the "Próximamente" tag. */}
      {feature.enforced && (
        <FeatureControl
          feature={feature}
          draft={draft}
          modified={modified}
          disabled={locked}
          onChange={onChange}
        />
      )}
      <FeatureStatusLine {...props} />
    </li>
  );
}
