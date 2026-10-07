import { cn } from "@lila-care/design-system";
import { FeatureDefinition } from "@/api/plans";
import { FIELD_CONTROL_CLASS } from "@/Admin/ledger/FormField";
import { LimitDraft, validateLimit } from "@/Admin/plans/entitlementsDraft";

interface LimitControlProps {
  feature: FeatureDefinition;
  draft: LimitDraft;
  onChange: (draft: LimitDraft) => void;
  disabled: boolean;
}

// Text input (so "2,5" can be shown and flagged, which a number input would swallow) +
// "Ilimitado" checkbox. Empty or Ilimitado = unlimited (`null`); 0 is valid and blocks the
// feature, with an inline note.
export function LimitControl({
  feature,
  draft,
  onChange,
  disabled,
}: LimitControlProps) {
  const { key } = feature;
  const noteId = `feature-limit-${key}-note`;
  const error = disabled ? null : validateLimit(draft);
  const blocksFeature = !draft.unlimited && draft.raw.trim() === "0";
  // Empty without "Ilimitado" ticked still saves as unlimited — say so.
  const becomesUnlimited = !disabled && !draft.unlimited && draft.raw.trim() === "";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          id={`feature-limit-${key}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${feature.label}: cupo`}
          aria-invalid={error !== null}
          aria-describedby={noteId}
          disabled={disabled || draft.unlimited}
          value={draft.raw}
          placeholder={draft.unlimited ? "" : "Ilimitado"}
          onChange={(e) => onChange({ unlimited: false, raw: e.target.value })}
          className={cn(
            FIELD_CONTROL_CLASS,
            "w-28",
            error && "border-destructive",
          )}
          data-testid={`feature-limit-input-${key}`}
        />
        <label className="type-body-sm flex items-center gap-2 text-text-secondary">
          <input
            type="checkbox"
            checked={draft.unlimited}
            disabled={disabled}
            onChange={(e) => onChange({ unlimited: e.target.checked, raw: "" })}
            className="size-4 accent-primary"
            data-testid={`feature-unlimited-${key}`}
          />
          Ilimitado
        </label>
      </div>
      <div id={noteId} aria-live="polite">
        {error && (
          <p
            className="type-body-sm text-destructive"
            data-testid={`feature-error-${key}`}
          >
            {error}
          </p>
        )}
        {!error && becomesUnlimited && (
          <p
            className="type-body-sm text-text-secondary"
            data-testid={`feature-empty-note-${key}`}
          >
            Quedará ilimitado
          </p>
        )}
        {!error && blocksFeature && (
          <p
            className="type-body-sm text-text-secondary"
            data-testid={`feature-zero-note-${key}`}
          >
            0 bloquea esta característica
          </p>
        )}
      </div>
    </div>
  );
}
