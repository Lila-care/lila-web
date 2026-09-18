import { Loader2 } from "lucide-react";
import type { PlanDto } from "@/api/plans";
import { ALL_FILTER, type DiscountListFilters } from "@/Admin/useDiscounts";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lila-care/design-system";

interface DiscountFiltersProps {
  plans: PlanDto[];
  filters: DiscountListFilters;
  disabled: boolean;
  isRefetching: boolean;
  hasActiveFilters: boolean;
  onPlanChange: (plan: string) => void;
  onStatusChange: (status: DiscountListFilters["status"]) => void;
  onClear: () => void;
}

function isStatusFilter(value: string): value is DiscountListFilters["status"] {
  return value === ALL_FILTER || value === "active" || value === "inactive";
}

export function DiscountFilters({
  plans,
  filters,
  disabled,
  isRefetching,
  hasActiveFilters,
  onPlanChange,
  onStatusChange,
  onClear,
}: DiscountFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="discounts-filter-plan"
          className="text-sm font-medium text-neutral-900"
        >
          Plan
        </label>
        <Select
          value={filters.plan}
          onValueChange={onPlanChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="discounts-filter-plan"
            className="w-full border-border! lg:w-56"
            data-testid="discounts-filter-plan"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>Todos los planes</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.planId} value={plan.planId}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="discounts-filter-status"
          className="text-sm font-medium text-neutral-900"
        >
          Estado
        </label>
        <Select
          value={filters.status}
          onValueChange={(value) => {
            if (isStatusFilter(value)) onStatusChange(value);
          }}
          disabled={disabled}
        >
          <SelectTrigger
            id="discounts-filter-status"
            className="w-full border-border! lg:w-56"
            data-testid="discounts-filter-status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            data-testid="discounts-clear-filters"
          >
            Limpiar filtros
          </Button>
        )}
        {isRefetching && (
          <Loader2
            className="size-3.5 animate-spin text-neutral-600"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
