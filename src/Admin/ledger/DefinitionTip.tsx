import { useId, useState } from "react";
import { Info } from "lucide-react";

interface DefinitionTipProps {
  label: string;
  children: string;
  testId: string;
}

// Hover AND keyboard-focus tooltip (the trigger is a real button), so the definition is not a
// mouse-only affordance. The tooltip stays open while the pointer is over it (group-hover),
// can be dismissed with Escape (WCAG 1.4.13) and is hidden with `invisible` (not display:none)
// so the aria-describedby text stays available to screen readers.
export function DefinitionTip({ label, children, testId }: DefinitionTipProps) {
  const tipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const reset = () => setDismissed(false);
  return (
    <span
      className="group relative inline-flex"
      onKeyDown={(event) => {
        if (event.key === "Escape") setDismissed(true);
      }}
      onMouseLeave={reset}
      onBlur={reset}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tipId}
        className="inline-flex size-5 items-center justify-center rounded-xs text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-teal-700"
        data-testid={`${testId}-trigger`}
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={`type-body-sm absolute top-full left-0 z-10 mt-1 w-56 rounded-sm border border-border-default bg-surface-default p-2 text-text-primary ${
          dismissed
            ? "invisible"
            : "invisible group-focus-within:visible group-hover:visible"
        }`}
        data-testid={testId}
      >
        {children}
      </span>
    </span>
  );
}
