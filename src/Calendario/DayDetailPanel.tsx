import { getPhaseInfo } from "@/lib/phaseInfo";
import type { CalendarDayUiModel } from "@/Calendario/useCalendario";
import type { CalendarViewMode } from "@/Calendario/ViewModeToggle";

interface DayDetailPanelProps {
  date: string | null;
  dayData: CalendarDayUiModel | undefined;
  viewMode: CalendarViewMode;
}

function formatLongDate(isoDate: string): string {
  // new Date("YYYY-MM-DD") se interpreta como UTC medianoche — usamos T00:00:00 explícito con
  // el mismo efecto para que el locale formatting no dependa de la zona horaria del browser.
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function DayDetailPanel({ date, dayData, viewMode }: DayDetailPanelProps) {
  if (!date) {
    return (
      <div
        data-testid="day-detail-empty"
        className="rounded-[32px] p-8 text-sm"
        style={{
          background: "rgba(61,43,80,0.05)",
          color: "rgba(61,43,80,0.6)",
        }}
      >
        Selecciona un día en el calendario para ver el detalle.
      </div>
    );
  }

  const showCycle = viewMode !== "luna";
  const showMoon = viewMode !== "ciclo";
  const info = getPhaseInfo(dayData?.phaseName ?? null);
  // Dato lunar viene de useCalendario (fetch de /moon-phase/range). Si todavía no cargó o falló
  // (moonPhaseName/moonIllumination en null), se oculta el bloque en vez de mostrar un valor
  // incorrecto — mismo criterio que "Sin datos de fase" usa para el ciclo.
  const moonPhaseName = dayData?.moonPhaseName ?? null;
  const moonIllumination = dayData?.moonIllumination ?? null;
  const hasMoonData = moonPhaseName != null && moonIllumination != null;
  // Reusa el gradiente sólido de phaseInfo.ts en vez de construir uno propio con alpha
  // (`${dotColor}cc`) — ese patrón dependía del color de fondo detrás del panel para el
  // contraste final, lo cual era frágil (el fallback de "sin datos" quedaba casi invisible
  // con texto blanco encima). info.gradient ya usa tonos sólidos verificados con WCAG AA.
  const gradient = showCycle
    ? info.gradient
    : "linear-gradient(160deg, #3D2B50, #6c4a91)";

  return (
    <div
      data-testid="day-detail-panel"
      className="rounded-[32px] p-8 text-white"
      style={{ background: gradient }}
    >
      <div className="text-[13px] text-white/70 mb-1 capitalize">
        {formatLongDate(date)}
      </div>
      <div
        className="font-bold text-2xl mb-4"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {showCycle
          ? dayData?.phaseName
            ? info.label
            : "Sin datos de fase"
          : hasMoonData
            ? moonPhaseName
            : "Sin datos de luna"}
      </div>

      {showMoon && hasMoonData && (
        <div
          className="bg-white/10 rounded-2xl p-4 mb-3.5"
          data-testid="day-detail-moon-block"
        >
          <div className="text-[11.5px] uppercase tracking-wide text-white/60 mb-1.5">
            Luna
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-[14.5px] font-semibold">
              {moonPhaseName} · {moonIllumination}%
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/10 rounded-2xl p-4">
        <div className="text-[11.5px] uppercase tracking-wide text-white/60 mb-1.5">
          Registro
        </div>
        <div className="text-sm leading-relaxed text-white/85">
          Sin síntomas registrados todavía hoy.
        </div>
      </div>

      <button
        type="button"
        disabled
        title="Próximamente"
        data-testid="add-record-button"
        className="w-full mt-5 bg-white py-3.5 rounded-2xl text-sm font-semibold cursor-not-allowed opacity-70"
        style={{ color: info.dotColor }}
      >
        Añadir registro
      </button>
    </div>
  );
}

export default DayDetailPanel;
