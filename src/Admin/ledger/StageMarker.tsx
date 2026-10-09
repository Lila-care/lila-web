import { cn } from "@lila-care/design-system";

// Figma StageMarker (885:2000): 8x8, four variants. Only `teal` uses the accent; the other
// three are plum-gray (text/secondary) and differ by shape. The text label always sits next
// to the marker, so the shape is never the only channel.
export type StageMarkerVariant = "ring" | "half" | "filled" | "teal";

const VARIANT_CLASSES: Record<StageMarkerVariant, string> = {
  ring: "border-text-secondary bg-transparent",
  half: "border-text-secondary bg-[linear-gradient(90deg,var(--text-secondary)_50%,transparent_50%)]",
  filled: "border-text-secondary bg-text-secondary",
  teal: "border-teal-700 bg-teal-700",
};

export function StageMarker({ variant }: { variant: StageMarkerVariant }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full border",
        VARIANT_CLASSES[variant],
      )}
      aria-hidden="true"
      data-testid={`stage-marker-${variant}`}
    />
  );
}
