import { PlanStatus } from "@/api/plans";
import { formatPlanStatus } from "@/Admin/plansFormat";
import { ToggleSwitch } from "@/Admin/plans/ToggleSwitch";

interface PlanStatusFieldProps {
  status: PlanStatus;
  changed: boolean;
  // A "coming soon" plan has no on/off: its state is shown as text only.
  disabled?: boolean;
  onToggle: () => void;
}

// "Estado" as a switch + its current value. Deactivating still needs the second
// "¿Confirmar desactivación?" click on Guardar (see PlanPanel.handleSubmit).
export function PlanStatusField({
  status,
  changed,
  disabled = false,
  onToggle,
}: PlanStatusFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id="plan-status-label" className="type-caption text-text-secondary">
        Estado
      </span>
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked={status === "active"}
          onChange={onToggle}
          labelledBy="plan-status-label"
          disabled={disabled}
          testId="plan-status-toggle"
        />
        <span
          className="type-body-sm text-text-primary"
          data-testid="plan-status-value"
        >
          {formatPlanStatus(status)}
          {changed && " (sin guardar)"}
        </span>
      </div>
    </div>
  );
}
