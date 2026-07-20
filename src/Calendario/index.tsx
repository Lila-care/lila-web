import { useState } from "react";
import AppShell from "@/components/AppShell/AppShell";
import { useCalendario } from "@/Calendario/useCalendario";
import MonthGrid from "@/Calendario/MonthGrid";
import DayDetailPanel from "@/Calendario/DayDetailPanel";
import ResumenPerfilCard from "@/Calendario/ResumenPerfilCard";
import ViewModeToggle, {
  type CalendarViewMode,
} from "@/Calendario/ViewModeToggle";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function CalendarioPage() {
  const {
    year,
    month,
    days,
    loading,
    error,
    goToPreviousMonth,
    goToNextMonth,
  } = useCalendario();
  const [selectedDate, setSelectedDate] = useState<string | null>(
    todayIsoDate(),
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("ambos");

  const selectedDayData = days.find((d) => d.date === selectedDate);

  return (
    <AppShell>
      <main className="px-6 md:px-16 pt-14 pb-16">
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div>
            <h1
              className="font-bold text-3xl md:text-[40px] mb-2 -tracking-[0.5px]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Calendario
            </h1>
            <p className="text-[15px]" style={{ color: "rgba(61,43,80,0.6)" }}>
              Tu ciclo, mes a mes.
            </p>
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        {loading && (
          <div
            data-testid="calendario-loading"
            className="bg-white rounded-3xl p-10 animate-pulse"
            style={{ border: "1px solid rgba(61,43,80,0.07)" }}
          >
            <div className="h-6 w-48 bg-black/5 rounded mb-4" />
            <div className="h-64 w-full bg-black/5 rounded" />
          </div>
        )}

        {!loading && error && (
          <div
            data-testid="calendario-error"
            className="bg-white rounded-3xl p-8 text-sm"
            style={{
              border: "1px solid rgba(139,58,82,0.2)",
              color: "#8B3A52",
            }}
          >
            No pudimos cargar tu calendario. {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6 items-start">
            <MonthGrid
              year={year}
              month={month}
              days={days}
              selectedDate={selectedDate}
              viewMode={viewMode}
              onSelectDate={setSelectedDate}
              onPrevMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
            />
            <div className="flex flex-col gap-6">
              <ResumenPerfilCard />
              <DayDetailPanel
                date={selectedDate}
                dayData={selectedDayData}
                viewMode={viewMode}
              />
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

export default CalendarioPage;
