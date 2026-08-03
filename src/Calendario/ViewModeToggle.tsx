export type CalendarViewMode = "ambos" | "ciclo" | "luna";

interface ViewModeToggleProps {
  value: CalendarViewMode;
  onChange: (mode: CalendarViewMode) => void;
}

const OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [
  { value: "ambos", label: "Ambos" },
  { value: "ciclo", label: "Ciclo" },
  { value: "luna", label: "Luna" },
];

// Segmented control del handoff (Calendario.dc.html líneas 74-79) — filtra qué datos muestran
// MonthGrid/DayDetailPanel: "ciclo" oculta la luna, "luna" oculta los colores de fase, "ambos"
// (default) muestra todo. Estado local, no requiere backend.
function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div
      data-testid="calendar-view-mode-toggle"
      className="flex bg-white rounded-2xl p-1 gap-0.5"
      style={{ border: "1px solid rgba(61,43,80,0.1)" }}
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            data-testid={`view-mode-${option.value}`}
            className="px-4 py-2.5 rounded-[11px] text-[13.5px] font-semibold"
            style={
              isActive
                ? { background: "#9B72C8", color: "#fff" }
                : { color: "rgba(61,43,80,0.55)" }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default ViewModeToggle;
