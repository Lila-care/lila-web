import { CheckCircle2, Circle } from "lucide-react";
import { PlanStatus } from "@/api/plans";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<PlanStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
};

const STATUS_CLASSES: Record<PlanStatus, string> = {
  active: "bg-green-600 text-white",
  inactive: "bg-white text-neutral-600 border border-neutral-300",
};

const STATUS_ICON: Record<PlanStatus, typeof CheckCircle2> = {
  active: CheckCircle2,
  inactive: Circle,
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const Icon = STATUS_ICON[status];

  return (
    <span
      data-testid="plan-status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
