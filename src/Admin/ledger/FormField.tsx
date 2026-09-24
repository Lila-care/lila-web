import { ReactNode } from "react";

// Figma panel input: 1px border-default, radius 10px (rounded-md), px 12 py 10, body-md.
export const FIELD_CONTROL_CLASS =
  "type-body-md w-full rounded-md border border-border-default bg-transparent px-3 py-2.5 text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-text-secondary";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, htmlFor, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="type-caption text-text-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="type-caption text-text-secondary">{hint}</p>}
    </div>
  );
}
