import { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { SECONDARY_BUTTON } from "@/Admin/contentUi";

export function ContentLoading({
  label,
  testId,
}: {
  label: string;
  testId: string;
}) {
  return (
    <div
      className="flex items-center gap-2 py-12 text-gray-500"
      data-testid={testId}
      role="status"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ContentError({
  message,
  onRetry,
  testId,
}: {
  message: string;
  onRetry?: () => void;
  testId: string;
}) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-[12px] border border-red-200 bg-red-50 p-4 text-red-800"
      data-testid={testId}
      role="alert"
    >
      <p className="flex items-start gap-2 text-sm">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={SECONDARY_BUTTON}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function ContentEmpty({
  title,
  children,
  testId,
}: {
  title: string;
  children?: ReactNode;
  testId: string;
}) {
  return (
    <div className="py-16 text-center" data-testid={testId}>
      <p className="mb-1 text-gray-600">{title}</p>
      {children && <div className="text-sm text-gray-400">{children}</div>}
    </div>
  );
}

// Inline error for a failed write, with an optional action (e.g. reload on a concurrent edit).
export function MutationErrorAlert({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
      data-testid="content-mutation-error"
      role="alert"
    >
      <p className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {action}
    </div>
  );
}
