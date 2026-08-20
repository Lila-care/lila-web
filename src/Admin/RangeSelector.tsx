import { Loader2 } from "lucide-react";
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
  // Shows a small inline spinner next to the trigger while a refetch is in flight.
  loading?: boolean;
}

export function RangeSelector({
  value,
  onChange,
  disabled,
  loading,
}: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(Number(v) as DashboardRangeDays)}
        disabled={disabled}
      >
        <SelectTrigger className="w-32" data-testid="range-selector">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && (
        <Loader2
          className="size-3.5 animate-spin text-neutral-400"
          aria-hidden="true"
          data-testid="range-selector-loading"
        />
      )}
    </div>
  );
}
