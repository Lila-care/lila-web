import { cn } from "@lila-care/design-system";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
  disabled?: boolean;
  testId: string;
  // Identifies the control for the matrix deep-link focus.
  controlKey?: string;
}

// Accessible on/off switch (role="switch" + aria-checked); flat, no shadow — the thumb is the
// only moving part. Labelled by the feature label next to it.
export function ToggleSwitch({
  checked,
  onChange,
  labelledBy,
  disabled = false,
  testId,
  controlKey,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        checked ? "bg-primary" : "bg-border-strong",
      )}
      data-testid={testId}
      data-feature-control={controlKey}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-card transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
