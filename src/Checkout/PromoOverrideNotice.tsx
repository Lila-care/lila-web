import { AlertTriangle } from "lucide-react";
import { buttonVariants, cn } from "@lila-care/design-system";
import { formatCop } from "./formatCop";

interface PromoOverrideNoticeProps {
  withCodeInCents: number;
  withoutCodeInCents: number;
  // Same lock as the code field: no changes while a quote/payment is in flight.
  isLocked: boolean;
  onRemove: () => void;
}

// A custom code REPLACES the automatic promo. When that leaves her paying more than the promo
// would, say so and offer the way back; it never blocks the code (BE decides validity).
export default function PromoOverrideNotice({
  withCodeInCents,
  withoutCodeInCents,
  isLocked,
  onRemove,
}: PromoOverrideNoticeProps) {
  return (
    <div
      data-testid="promo-override-notice"
      className="flex flex-col gap-2 rounded-[12px] border border-feedback-warning-border bg-surface-default p-3 text-xs text-feedback-warning-text"
    >
      <p className="flex items-start gap-2">
        <AlertTriangle
          aria-hidden="true"
          className="mt-px size-4 shrink-0"
        />
        <span className="min-w-0">
          Con este código pagas {formatCop(withCodeInCents)}; sin él la promo te
          deja en {formatCop(withoutCodeInCents)}.
        </span>
      </p>
      <button
        type="button"
        data-testid="promo-override-remove"
        aria-disabled={isLocked || undefined}
        onClick={isLocked ? undefined : onRemove}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "self-start rounded-[12px]! text-feedback-warning-text outline-none! hover:bg-surface-muted! hover:text-brand-primary aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        )}
      >
        Quitar código
      </button>
    </div>
  );
}
