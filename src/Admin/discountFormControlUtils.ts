import type { DiscountFormField } from "@/Admin/discountForm";

// `border-border` (not the DS default `border-input`): `--input` is undefined in light mode in
// @lila-care/design-system 0.3.0, so the default border would fall back to currentColor.
export const CONTROL_BORDER = "border border-border";
export const FOCUS_RING =
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
export const INPUT_CLASS = `h-9 w-full rounded-md ${CONTROL_BORDER} bg-background px-3 text-sm text-neutral-900 shadow-xs outline-none ${FOCUS_RING} aria-[invalid=true]:border-destructive disabled:opacity-50`;

export const FIELD_IDS: Record<DiscountFormField, string> = {
  planId: "discount-plan",
  kind: "discount-kind",
  code: "discount-code-input",
  valueType: "discount-value-type",
  value: "discount-value",
  startsDate: "discount-starts",
  endsDate: "discount-ends",
};

export function helpId(id: string) {
  return `${id}-help`;
}

export function errorId(id: string) {
  return `${id}-error`;
}

// Space-separated ids for `aria-describedby`, only for the elements that actually render.
export function describedBy(id: string, hasHelp: boolean, hasError: boolean) {
  const ids = [
    hasHelp ? helpId(id) : null,
    hasError ? errorId(id) : null,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
