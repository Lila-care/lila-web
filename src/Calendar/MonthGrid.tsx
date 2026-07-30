import { ChevronLeft, ChevronRight, Moon } from "lucide-react";
import { getPhaseInfo, PHASE_INFO, NO_PHASE_INFO } from "@/lib/phaseInfo";
import type { CalendarDayUiModel } from "@/Calendar/useCalendar";
import type { CalendarViewMode } from "@/Calendar/ViewModeToggle";

const MONTH_LABEL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEKDAY_LABEL = ["D", "L", "M", "X", "J", "V", "S"];

// Umbral de iluminación para marcar un día como luna llena (>=97%) o nueva (<=3%) en la
// grilla — mismo criterio que el BE usa para esos extremos. moonIllumination viene del
// endpoint /moon-phase/range (fetcheado por useCalendar); null si todavía no cargó o falló,
// en cuyo caso el ícono simplemente no se muestra.
function isNotableMoonDay(dayData: CalendarDayUiModel | undefined): boolean {
  if (dayData?.moonIllumination == null) return false;
  return dayData.moonIllumination >= 97 || dayData.moonIllumination <= 3;
}

export type MonthGridSize = "full" | "compact";

interface MonthGridProps {
  year: number;
  month: number;
  days: CalendarDayUiModel[];
  selectedDate: string | null;
  viewMode: CalendarViewMode;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  // "compact" = mismo diseño y lógica de color, pero pensado para caber en un espacio angosto
  // (ej. una card dentro del chat): chrome más chico y sin leyenda por default.
  size?: MonthGridSize;
  showLegend?: boolean;
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
  size = "full",
  showLegend = size === "full",
}: MonthGridProps) {
  const compact = size === "compact";
  const showCycle = viewMode !== "moon";
  const showMoon = viewMode !== "cycle";
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
      data-size={size}
      className={
        compact ? "bg-white rounded-2xl p-4" : "bg-white rounded-3xl p-7"
      }
      style={{
        border: "1px solid rgba(61,43,80,0.07)",
        boxShadow: compact ? undefined : "0 4px 24px rgba(61,43,80,0.05)",
      }}
    >
      <div
        className={
          compact
            ? "flex items-center justify-between mb-3"
            : "flex items-center justify-between mb-5"
        }
      >
        <button
          type="button"
          onClick={onPrevMonth}
          data-testid="month-grid-prev"
          className={
            compact
              ? "w-6 h-6 rounded-lg flex items-center justify-center"
              : "w-8 h-8 rounded-[10px] flex items-center justify-center"
          }
          style={{ border: "1px solid rgba(61,43,80,0.12)" }}
        >
          <ChevronLeft size={compact ? 12 : 15} color="#3D2B50" />
        </button>
        <div
          className={
            compact ? "font-semibold text-sm" : "font-semibold text-lg"
          }
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {MONTH_LABEL[month]} {year}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          data-testid="month-grid-next"
          className={
            compact
              ? "w-6 h-6 rounded-lg flex items-center justify-center"
              : "w-8 h-8 rounded-[10px] flex items-center justify-center"
          }
          style={{ border: "1px solid rgba(61,43,80,0.12)" }}
        >
          <ChevronRight size={compact ? 12 : 15} color="#3D2B50" />
        </button>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-7 gap-1 mb-1"
            : "grid grid-cols-7 gap-1.5 mb-2"
        }
      >
        {WEEKDAY_LABEL.map((label) => (
          <div
            key={label}
            className={
              compact
                ? "text-center text-[9.5px] font-semibold py-1"
                : "text-center text-[11.5px] font-semibold py-1.5"
            }
            style={{ color: "rgba(61,43,80,0.4)" }}
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className={
          compact ? "grid grid-cols-7 gap-1" : "grid grid-cols-7 gap-1.5"
        }
      >
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} />;
          const dayData = dayByDate.get(cell.date);
          const info = getPhaseInfo(dayData?.phaseName ?? null);
          const isSelected = cell.date === selectedDate;
          const isToday = dayData?.isToday ?? false;
          const showPhaseColor = showCycle && !!dayData?.phaseName;
          const showMoonDot = showMoon && isNotableMoonDay(dayData);
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
              className={
                compact
                  ? "relative aspect-square rounded-lg flex items-center justify-center text-[11px] font-semibold"
                  : "relative aspect-square rounded-2xl flex items-center justify-center text-[13px] font-semibold"
              }
              style={{
                // info.dotColor es ahora un token CSS ("var(--color-phase-*)"), no un hex
                // literal — el truco anterior de concatenar un sufijo de alpha (`${hex}22`) no
                // funciona sobre un var(), así que se usa color-mix() para el mismo efecto.
                background: showPhaseColor
                  ? `color-mix(in srgb, ${info.dotColor} 13%, white)`
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
                  size={compact ? 8 : 10}
                  data-testid="calendar-day-moon-icon"
                  className={
                    compact ? "absolute bottom-1" : "absolute bottom-1.5"
                  }
                  fill={info.dotColor}
                  color={info.dotColor}
                />
              )}
            </button>
          );
        })}
      </div>

      {showLegend && showCycle && (
        <div className="flex gap-4 mt-5 flex-wrap" data-testid="phase-legend">
          {(Object.keys(PHASE_INFO) as Array<keyof typeof PHASE_INFO>).map(
            (phase) => (
              <div
                key={phase}
                className="flex items-center gap-1.5 text-[12.5px]"
                style={{ color: "rgba(61,43,80,0.6)" }}
              >
                <span
                  className="w-[9px] h-[9px] rounded-full"
                  style={{ background: PHASE_INFO[phase].dotColor }}
                />
                {PHASE_INFO[phase].label.replace("Fase ", "")}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default MonthGrid;
