import { ChevronLeft, ChevronRight, Moon } from "lucide-react";
import { getPhaseInfo, PHASE_INFO, NO_PHASE_INFO } from "@/lib/phaseInfo";
import { getMoonPhase } from "@/lib/moonPhase";
import type { DayPhaseUiModel } from "@/api/cycleTracking";
import type { CalendarViewMode } from "@/Calendario/ViewModeToggle";

const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAY_LABEL = ["D", "L", "M", "X", "J", "V", "S"];

// Umbral de iluminación para marcar un día como luna llena (>=97%) o nueva (<=3%) en la
// grilla — mismo criterio que phaseNameFromAge en moonPhase.ts usa para esos extremos.
function isNotableMoonDay(date: string): boolean {
  const illumination = getMoonPhase(new Date(`${date}T00:00:00`)).illumination;
  return illumination >= 97 || illumination <= 3;
}

interface MonthGridProps {
  year: number;
  month: number;
  days: DayPhaseUiModel[];
  selectedDate: string | null;
  viewMode: CalendarViewMode;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function MonthGrid({
  year,
  month,
  days,
  selectedDate,
  viewMode,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MonthGridProps) {
  const showCycle = viewMode !== "luna";
  const showMoon = viewMode !== "ciclo";
  const dayByDate = new Map(days.map((d) => [d.date, d]));
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingBlanks = firstOfMonth.getUTCDay();

  const cells: Array<{ date: string; dayNumber: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, dayNumber: d });
  }

  return (
    <div
      data-testid="month-grid"
      className="bg-white rounded-3xl p-7"
      style={{
        border: "1px solid rgba(61,43,80,0.07)",
        boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <button
          type="button"
          onClick={onPrevMonth}
          data-testid="month-grid-prev"
          className="w-8 h-8 rounded-[10px] flex items-center justify-center"
          style={{ border: "1px solid rgba(61,43,80,0.12)" }}
        >
          <ChevronLeft size={15} color="#3D2B50" className="shrink-0" />
        </button>
        <div
          className="font-semibold text-lg"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {MONTH_LABEL[month]} {year}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          data-testid="month-grid-next"
          className="w-8 h-8 rounded-[10px] flex items-center justify-center"
          style={{ border: "1px solid rgba(61,43,80,0.12)" }}
        >
          <ChevronRight size={15} color="#3D2B50" className="shrink-0" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAY_LABEL.map((label) => (
          <div
            key={label}
            className="text-center text-[11.5px] font-semibold py-1.5"
            style={{ color: "rgba(61,43,80,0.4)" }}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} />;
          const dayData = dayByDate.get(cell.date);
          const info = getPhaseInfo(dayData?.phaseName ?? null);
          const isSelected = cell.date === selectedDate;
          const isToday = dayData?.isToday ?? false;
          const showPhaseColor = showCycle && !!dayData?.phaseName;
          const showMoonDot = showMoon && isNotableMoonDay(cell.date);
          // Sin phaseName la celda queda plana (mismo fondo neutro que cualquier otro día) —
          // "hoy" necesita distinguirse igual, con el mismo tono neutro del fallback de
          // phaseInfo.ts. Si además está seleccionada, el contorno de selección (más grueso)
          // tiene prioridad visual.
          const todayColor = NO_PHASE_INFO.dotColor;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              data-testid="calendar-day-cell"
              data-date={cell.date}
              data-today={isToday || undefined}
              className="relative aspect-square rounded-2xl flex items-center justify-center text-[13px] font-semibold"
              style={{
                background: showPhaseColor
                  ? `${info.dotColor}22`
                  : "rgba(61,43,80,0.04)",
                color: showPhaseColor ? info.textColor : "#3D2B50",
                boxShadow: isSelected
                  ? `inset 0 0 0 2px ${info.dotColor}`
                  : isToday
                    ? `inset 0 0 0 1.5px ${todayColor}`
                    : undefined,
              }}
            >
              {cell.dayNumber}
              {showMoonDot && (
                <Moon
                  size={10}
                  data-testid="calendar-day-moon-icon"
                  className="absolute bottom-1.5"
                  fill={info.dotColor}
                  color={info.dotColor}
                />
              )}
            </button>
          );
        })}
      </div>

      {showCycle && (
        <div className="flex gap-4 mt-5 flex-wrap" data-testid="phase-legend">
          {(Object.keys(PHASE_INFO) as Array<keyof typeof PHASE_INFO>).map((phase) => (
            <div key={phase} className="flex items-center gap-1.5 text-[12.5px]" style={{ color: "rgba(61,43,80,0.6)" }}>
              <span
                className="w-[9px] h-[9px] rounded-full"
                style={{ background: PHASE_INFO[phase].dotColor }}
              />
              {PHASE_INFO[phase].label.replace("Fase ", "")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MonthGrid;
