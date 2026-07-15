import { getPhaseInfo } from "@/lib/phaseInfo";
import { getMoonPhase } from "@/lib/moonPhase";
import type { PhaseName } from "@/api/cycleTracking";

interface PhaseHeroCardProps {
  phase: PhaseName | null;
  cycleDay: number | null;
}

const PHASE_MESSAGE: Record<PhaseName, string> = {
  MENSTRUATION:
    "Tu energía está más baja hoy. Es buen momento para ir despacio y priorizar el descanso.",
  FOLLICULAR:
    "Tu energía empieza a subir. Buen momento para planear y moverte más.",
  OVULATION:
    "Estás en tu pico de energía. Buen momento para conversaciones y conexión.",
  LUTEAL:
    "Tu energía baja poco a poco. El cuerpo pide orden y calma.",
};

function PhaseHeroCard({ phase, cycleDay }: PhaseHeroCardProps) {
  const info = getPhaseInfo(phase);
  const moon = getMoonPhase();

  return (
    <div
      data-testid="phase-hero-card"
      className="relative overflow-hidden p-10 mb-7 text-white"
      style={{
        borderRadius: "42px 38px 44px 40px / 46px 40px 42px 44px",
        background: info.gradient,
      }}
    >
      <div className="relative flex items-end justify-between gap-8 flex-wrap">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold mb-4"
            style={{ background: "rgba(255,255,255,0.16)" }}
          >
            <span className="w-[7px] h-[7px] rounded-full bg-white" />
            {info.label}
          </div>
          <div
            className="font-bold text-[56px] leading-none mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
            data-testid="phase-hero-cycle-day"
          >
            {cycleDay != null ? `Día ${cycleDay}` : "Sin datos"}
          </div>
          <div className="text-[15px] leading-relaxed text-white/90 max-w-[400px]">
            {phase ? PHASE_MESSAGE[phase] : "Aún no tenemos suficientes datos de tu ciclo."}
          </div>
        </div>
        <div className="text-right shrink-0" data-testid="moon-phase-widget">
          <div className="flex items-center gap-2.5 justify-end mb-2">
            <div className="text-[14.5px] font-semibold">{moon.phaseName}</div>
          </div>
          <div className="text-[12.5px] text-white/70">
            {moon.illumination}% visible
          </div>
        </div>
      </div>
    </div>
  );
}

export default PhaseHeroCard;
