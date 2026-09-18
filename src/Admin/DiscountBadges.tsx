import type { DiscountDto } from "@/api/discounts";
import {
  DERIVED_STATUS_LABEL,
  getDerivedStatus,
  type DerivedDiscountStatus,
} from "@/Admin/discountFormat";
import { cn } from "@/lib/utils";

const BADGE_BASE =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_CLASSES: Record<DerivedDiscountStatus, string> = {
  inactive: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-800",
  current: "bg-green-100 text-green-800",
  expired: "bg-amber-100 text-amber-800",
};

export function DiscountStatusBadge({
  discount,
}: {
  discount: Pick<DiscountDto, "status" | "startsAt" | "endsAt">;
}) {
  const derived = getDerivedStatus(discount);
  return (
    <span
      data-testid="discount-status-badge"
      data-status={derived}
      className={cn(BADGE_BASE, STATUS_CLASSES[derived])}
    >
      {DERIVED_STATUS_LABEL[derived]}
    </span>
  );
}

// Static discounts only ever show "Automático": their generated AUTO-… code is never rendered.
export function DiscountKindBadge({ discount }: { discount: DiscountDto }) {
  if (discount.kind === "static") {
    return (
      <span
        data-testid="discount-kind-badge"
        className={cn(BADGE_BASE, "bg-secondary text-secondary-foreground")}
      >
        Automático
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <span
        data-testid="discount-kind-badge"
        className={cn(
          BADGE_BASE,
          "border border-border bg-white text-neutral-700",
        )}
      >
        Código
      </span>
      <span
        data-testid="discount-code"
        className="font-mono text-sm break-all text-neutral-900"
      >
        {discount.code}
      </span>
    </span>
  );
}
