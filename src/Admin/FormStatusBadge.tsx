import { FormStatus } from "@/api/forms";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<FormStatus, string> = {
  draft: "Borrador",
  live: "Publicado",
  archived: "Archivado",
};

const STATUS_CLASSES: Record<FormStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  live: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
};

export function FormStatusBadge({ status }: { status: FormStatus }) {
  return (
    <span
      data-testid="form-status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
