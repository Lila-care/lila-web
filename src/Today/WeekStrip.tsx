import { cn } from "@/lib/utils";
import { getPhaseInfo } from "@/lib/phaseInfo";
import type { DayPhaseUiModel } from "@/api/cycleTracking";

interface WeekStripProps {
  week: DayPhaseUiModel[];
}

const DAY_LABEL: Record<string, string> = {
  SUNDAY: "D",
  MONDAY: "L",
  TUESDAY: "M",
  WEDNESDAY: "X",
  THURSDAY: "J",
  FRIDAY: "V",
  SATURDAY: "S",
};

function WeekStrip({ week }: WeekStripProps) {
  if (week.length === 0) {
    return (
      <div
        data-testid="week-strip-empty"
        className="bg-white rounded-3xl p-6 text-sm"
        style={{
          border: "1px solid rgba(61,43,80,0.07)",
          boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
          color: "rgba(61,43,80,0.6)",
        }}
      >
        Todavía no hay datos de tu semana.
      </div>
    );
  }

  return (
    <div
      data-testid="week-strip"
      className="bg-white rounded-3xl p-6"
      style={{
        border: "1px solid rgba(61,43,80,0.07)",
        boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
      }}
    >
      <div
        className="font-semibold text-[17px] mb-4"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Tu semana
      </div>
      <div className="grid grid-cols-7 gap-2.5 text-center">
        {week.map((day) => {
          const info = getPhaseInfo(day.phaseName);
          return (
            <div key={day.date} data-testid="week-strip-day">
              <div
                className="text-[11.5px] mb-2"
                style={{ color: "rgba(61,43,80,0.45)" }}
              >
                {DAY_LABEL[day.dayOfWeek]}
              </div>
              <div
                className={cn(
                  "w-[34px] h-[34px] mx-auto rounded-full",
                  day.isToday && "ring-[3px]",
                )}
                style={{
                  background: info.dotColor,
                  ...(day.isToday
                    ? { boxShadow: `0 0 0 3px ${info.dotColor}33` }
                    : {}),
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekStrip;
