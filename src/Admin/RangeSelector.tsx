import { DashboardRangeDays } from "@/api/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lila-care/design-system";

const RANGE_OPTIONS: { value: DashboardRangeDays; label: string }[] = [
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
];

interface RangeSelectorProps {
  value: DashboardRangeDays;
  onChange: (days: DashboardRangeDays) => void;
  // Only true during the very first load — the select stays interactive during a refetch so
  // the user can change the range again before the previous request resolves.
  disabled?: boolean;
  // Refetch in flight. Shown as a text caption, never by dimming the content (Ledger spec).
  loading?: boolean;
}

export function RangeSelector({
  value,
  onChange,
  disabled,
  loading,
}: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      {loading && (
        <span
          className="type-caption text-text-secondary"
          data-testid="range-selector-loading"
        >
          Actualizando…
        </span>
      )}
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(Number(v) as DashboardRangeDays)}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          className="type-body-md w-32 rounded-sm border-border-strong bg-surface-default text-text-primary shadow-none"
          data-testid="range-selector"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-sm border-border-default bg-surface-default shadow-none">
          {RANGE_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={String(opt.value)}
              className="type-body-md text-text-primary focus:bg-surface-muted focus:text-text-primary"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
