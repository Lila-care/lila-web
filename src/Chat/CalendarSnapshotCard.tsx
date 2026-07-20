import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useLocation } from "wouter";
import { useCalendario } from "@/Calendario/useCalendario";
import MonthGrid from "@/Calendario/MonthGrid";

interface CalendarSnapshotCardProps {
  onClose?: () => void;
}

// Reusa MonthGrid en su variante "compact" (mismo diseño y lógica de fase/luna que
// Calendario/index.tsx) con su propio fetch vía useCalendario — se puede montar en cualquier
// parte del chat sin depender del estado de la página /calendario.
function CalendarSnapshotCard({ onClose }: CalendarSnapshotCardProps) {
  const { year, month, days, loading, error, goToPreviousMonth, goToNextMonth } =
    useCalendario();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [, navigate] = useLocation();

  return (
    <div
      data-testid="chat-calendar-snapshot"
      className="rounded-[20px] p-4 bg-white"
      style={{
        border: "1px solid rgba(74,45,110,.08)",
        boxShadow: "0 4px 18px rgba(74,45,110,.08)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} color="#9B72C8" />
          <span className="text-[13px] font-semibold" style={{ color: "#3D2B50" }}>
            Tu calendario
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            data-testid="chat-calendar-snapshot-close"
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ color: "#8A8194" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading && (
        <div className="text-xs text-[#8A8194] py-6 text-center">Cargando...</div>
      )}

      {!loading && error && (
        <div className="text-xs" style={{ color: "#8B3A52" }}>
          No pudimos cargar tu calendario.
        </div>
      )}

      {!loading && !error && (
        <MonthGrid
          year={year}
          month={month}
          days={days}
          selectedDate={selectedDate}
          viewMode="ambos"
          onSelectDate={setSelectedDate}
          onPrevMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
          size="compact"
        />
      )}

      <button
        type="button"
        onClick={() => navigate("/calendario")}
        data-testid="chat-calendar-snapshot-cta"
        className="w-full mt-3 py-2.5 rounded-xl text-[13px] font-semibold"
        style={{ color: "#fff", background: "#4A2D6E" }}
      >
        Ver calendario completo
      </button>
    </div>
  );
}

export default CalendarSnapshotCard;
