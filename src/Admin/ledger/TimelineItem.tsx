import { cn } from "@lila-care/design-system";
import { StageMarker, type StageMarkerVariant } from "@/Admin/ledger/StageMarker";

export type TimelineItemState = "done" | "stopped" | "pending";

interface TimelineItemProps {
  title: string;
  state: TimelineItemState;
  // Formatted date of a reached milestone ("7 oct · 09:16").
  date?: string;
  isLast: boolean;
  testId: string;
}

const MARKERS: Record<TimelineItemState, StageMarkerVariant> = {
  done: "filled",
  stopped: "half",
  pending: "ring",
};

// Figma TimelineItem (889:2374): left rail (8px marker + 1px line down to the next item, none
// after the last one). `stopped` gets the brand-light fill + "Se detuvo acá"; `pending` is the
// muted "Aún no". The state is always spelled out in text, not only by marker shape/color.
export function TimelineItem({
  title,
  state,
  date,
  isLast,
  testId,
}: TimelineItemProps) {
  const isPending = state === "pending";
  return (
    <li
      className={cn("flex gap-3 px-2 py-1.5", state === "stopped" && "bg-surface-brand-light")}
      data-testid={testId}
      data-state={state}
    >
      <div className="flex flex-col items-center pt-1.75">
        <StageMarker variant={MARKERS[state]} />
        {!isLast && (
          <span
            className="mt-1 w-px flex-1 bg-border-default"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-1">
        <span
          className={cn(
            "type-body-md break-words",
            isPending ? "text-text-muted" : "text-text-primary",
            state === "stopped" && "font-semibold",
          )}
        >
          {title}
        </span>
        {state === "done" && date && (
          <span className="type-caption text-text-secondary">{date}</span>
        )}
        {isPending && (
          <span className="type-caption text-text-muted">Aún no</span>
        )}
        {state === "stopped" && (
          <span className="type-caption-medium text-brand-primary">
            Se detuvo acá
          </span>
        )}
      </div>
    </li>
  );
}
