import { Search } from "lucide-react";
import { SelectFilter, type SelectFilterOption } from "@/Admin/ledger/SelectFilter";
import { USER_STAGES, STAGE_FILTER_LABELS } from "@/Admin/usersFormat";
import {
  hasActiveFilters,
  matchPreset,
  presetRange,
  RANGE_PRESET_DAYS,
  type UsersFilters,
} from "@/Admin/usersFilters";
import type { UserStage } from "@/api/users";

const ALL = "all";
const CUSTOM = "custom";

const STAGE_OPTIONS: SelectFilterOption[] = [
  { value: ALL, label: "Todas las etapas" },
  ...USER_STAGES.map((stage) => ({
    value: stage,
    label: STAGE_FILTER_LABELS[stage],
  })),
];

function rangeOptions(hasCustomRange: boolean): SelectFilterOption[] {
  return [
    { value: ALL, label: "Cualquier fecha de registro" },
    ...RANGE_PRESET_DAYS.map((days) => ({
      value: String(days),
      label: `Últimos ${days} días`,
    })),
    // Shown only when the URL carries a range that is not a preset (dashboard KPI links).
    ...(hasCustomRange ? [{ value: CUSTOM, label: "Rango personalizado" }] : []),
  ];
}

function rangeValue(filters: UsersFilters): string {
  if (!filters.from && !filters.to) return ALL;
  const preset = matchPreset(filters.from, filters.to);
  return preset === null ? CUSTOM : String(preset);
}

interface UsersFilterBarProps {
  filters: UsersFilters;
  onChange: (partial: Partial<UsersFilters>) => void;
  onClear: () => void;
}

// Figma FilterBar: 320px email search + stage select + registration-range select, "Limpiar"
// on the right while any filter is applied. Everything is URL state (see useAdminUrl).
export function UsersFilterBar({ filters, onChange, onClear }: UsersFilterBarProps) {
  const range = rangeValue(filters);

  const handleRange = (value: string) => {
    if (value === CUSTOM) return;
    if (value === ALL) onChange({ from: "", to: "", activeInRange: false });
    else onChange({ ...presetRange(Number(value)), activeInRange: false });
  };

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      role="search"
      data-testid="users-filter-bar"
    >
      <label className="relative block w-full sm:w-80">
        <span className="sr-only">Buscar por email</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Buscar por email"
          className="type-body-md h-9 w-full rounded-sm border border-border-strong bg-surface-default pr-3 pl-9 text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-teal-700"
          data-testid="users-search"
        />
      </label>
      <SelectFilter
        label="Filtrar por etapa"
        value={filters.stage || ALL}
        options={STAGE_OPTIONS}
        applied={!!filters.stage}
        onChange={(value) =>
          onChange({ stage: value === ALL ? "" : (value as UserStage) })
        }
        testId="users-stage-filter"
      />
      <SelectFilter
        label="Filtrar por fecha"
        value={range}
        options={rangeOptions(range === CUSTOM)}
        applied={range !== ALL}
        onChange={handleRange}
        testId="users-range-filter"
      />
      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="type-body-sm self-start rounded-xs px-1 text-teal-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700 sm:ml-auto sm:self-center"
          data-testid="users-clear-filters"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
