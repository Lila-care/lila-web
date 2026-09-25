import { LEARN_PHASES, type LearnPhase } from "@/api/learn";
import { phaseLabel } from "@/Admin/contentLabels";
import { INPUT } from "@/Admin/contentUi";

interface PhaseSelectProps {
  id: string;
  value: LearnPhase;
  onChange: (phase: LearnPhase) => void;
  disabled?: boolean;
  testId?: string;
}

export function PhaseSelect({
  id,
  value,
  onChange,
  disabled,
  testId,
}: PhaseSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as LearnPhase)}
      disabled={disabled}
      className={INPUT}
      data-testid={testId}
    >
      {LEARN_PHASES.map((phase) => (
        <option key={phase} value={phase}>
          {phaseLabel(phase)}
        </option>
      ))}
    </select>
  );
}
