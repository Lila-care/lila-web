import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { errorId, FOCUS_RING, helpId } from "@/Admin/discountFormControlUtils";

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={errorId(id)}
      data-testid={`${id}-error`}
      className="flex items-start gap-1.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}

export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        {" "}
        *
      </span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  );
}

export function FieldShell({
  id,
  label,
  required,
  help,
  error,
  children,
}: FieldShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {help && (
        <p id={helpId(id)} className="text-xs text-neutral-600">
          {help}
        </p>
      )}
      {error && <FieldError id={id} message={error} />}
    </div>
  );
}

interface RadioOptionProps {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  onChange: (value: string) => void;
}

// The label wraps the whole row so the touch target is the full row, not just the dot.
export function RadioOption({
  name,
  value,
  checked,
  label,
  description,
  onChange,
}: RadioOptionProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md py-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className={`mt-0.5 size-4 shrink-0 accent-primary outline-none ${FOCUS_RING}`}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-neutral-900">
          {label}
        </span>
        {description && (
          <span className="block text-xs text-neutral-600">{description}</span>
        )}
      </span>
    </label>
  );
}

export function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium text-neutral-900">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}
