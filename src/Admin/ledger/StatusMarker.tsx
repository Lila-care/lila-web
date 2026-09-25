import { cn } from "@lila-care/design-system";

export type StatusMarkerShape = "filled" | "half" | "ring";

// Subscription states are told apart by shape, not by a second hue — the Ledger only allows
// two accents (plum + teal), and shape also survives grayscale/color-blind viewing.
const SHAPE_CLASSES: Record<StatusMarkerShape, string> = {
  filled: "bg-teal-700",
  half: "bg-[linear-gradient(90deg,var(--teal-700)_50%,transparent_50%)]",
  ring: "bg-transparent",
};

export function StatusMarker({ shape }: { shape: StatusMarkerShape }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full border border-teal-700",
        SHAPE_CLASSES[shape],
      )}
      aria-hidden="true"
      data-testid={`status-marker-${shape}`}
    />
  );
}
