import { Archive, CheckCircle2, Pencil } from "lucide-react";
import { FormStatus } from "@/api/forms";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<FormStatus, string> = {
  draft: "Borrador",
  live: "Publicado",
  archived: "Archivado",
};

const STATUS_CLASSES: Record<FormStatus, string> = {
  draft: "bg-white text-neutral-600 border border-neutral-300",
  live: "bg-green-600 text-white",
  archived: "bg-amber-50 text-amber-700 border border-amber-200",
};

const STATUS_ICON: Record<FormStatus, typeof CheckCircle2> = {
  draft: Pencil,
  live: CheckCircle2,
  archived: Archive,
};

export function FormStatusBadge({ status }: { status: FormStatus }) {
  const Icon = STATUS_ICON[status];

  return (
    <span
      data-testid="form-status-badge"
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
