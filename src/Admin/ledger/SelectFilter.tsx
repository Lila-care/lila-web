import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lila-care/design-system";

export interface SelectFilterOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  value: string;
  options: SelectFilterOption[];
  onChange: (value: string) => void;
  // The accessible name (there is no visible label in the Figma filter bar).
  label: string;
  // Figma "applied" state: a filter other than the default is active.
  applied: boolean;
  testId: string;
}

// Figma Select/filter (889:2324): 36px, radius 8, 1px border. Default = border/strong;
// applied = surface/brand-light fill + brand/primary border. Built on the design system's
// Radix Select (keyboard + aria for free).
export function SelectFilter({
  value,
  options,
  onChange,
  label,
  applied,
  testId,
}: SelectFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "type-body-md w-full rounded-sm px-3 text-text-primary shadow-none sm:w-auto sm:min-w-44",
          applied
            ? "border-brand-primary bg-surface-brand-light"
            : "border-border-strong bg-surface-default",
        )}
        data-testid={testId}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-sm border-border-default bg-surface-default shadow-none">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="type-body-md text-text-primary focus:bg-surface-muted focus:text-text-primary"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
