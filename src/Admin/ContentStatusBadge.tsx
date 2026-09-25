import type { ReviewStatus } from "@/api/learn";
import { REVIEW_STATUS_LABEL } from "@/Admin/contentLabels";
import { cn } from "@/lib/utils";

// Same pill as FormStatusBadge, keyed by the Learn review status.
const STATUS_CLASSES: Record<ReviewStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  CHANGES_REQUESTED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-teal-100 text-teal-800",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-gray-200 text-gray-500",
};

export function ContentStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      data-testid="content-status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {REVIEW_STATUS_LABEL[status]}
    </span>
  );
}
