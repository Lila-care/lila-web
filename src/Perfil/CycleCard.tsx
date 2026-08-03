import { useState, type FormEvent } from "react";
import { Calendar, Info } from "lucide-react";
import type { PeriodSummary } from "@/api/cycleTracking";

interface CycleCardProps {
  summary: PeriodSummary | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: (values: { lastPeriodStart: string; cycleLength: number; periodLength: number }) => void;
}

const CYCLE_LENGTH_OPTIONS = [21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35];

function CycleCard({ summary, saving, saveError, saveSuccess, onSave }: CycleCardProps) {
  const [lastPeriodStart, setLastPeriodStart] = useState(
    summary?.lastPeriod?.start ?? "",
  );
  const [cycleLength, setCycleLength] = useState(
    summary?.cycle?.averageLength ?? 28,
  );
  // El mock no expone un input propio de "duración de la regla" — se envía el último valor
  // conocido del BE (o el default) junto con cycleLength en el mismo submit, como pide el
  // contrato (POST /period/start siempre recibe ambos campos juntos).
  const periodLength = summary?.lastPeriod?.length ?? 5;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!lastPeriodStart) return;
    onSave({ lastPeriodStart, cycleLength, periodLength });
  };

  return (
    <div
      data-testid="cycle-card"
      className="bg-white rounded-3xl p-6 md:p-7"
      style={{
        border: "1px solid rgba(61,43,80,0.07)",
        boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center"
          style={{ background: "#F3EDF7" }}
        >
          <Calendar size={19} color="#9B72C8" />
        </div>
        <div
          className="font-semibold text-[19px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Tu ciclo
        </div>
      </div>

      <form onSubmit={handleSubmit} data-testid="cycle-form">
        <label
          htmlFor="cycleLength"
          className="text-[12.5px] font-semibold uppercase tracking-wide block mb-2"
          style={{ color: "rgba(61,43,80,0.5)" }}
        >
          Duración promedio del ciclo
        </label>
        <select
          id="cycleLength"
          name="cycleLength"
          data-testid="cycle-length-select"
          value={cycleLength}
          onChange={(e) => setCycleLength(Number(e.target.value))}
          className="w-full px-3.5 py-3 rounded-xl text-[14.5px] mb-4.5"
          style={{
            border: "1px solid rgba(61,43,80,0.15)",
            background: "#FAF6F0",
            color: "#3D2B50",
          }}
        >
          {CYCLE_LENGTH_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} días
            </option>
          ))}
        </select>

        <label
          htmlFor="lastPeriodStart"
          className="text-[12.5px] font-semibold uppercase tracking-wide block mb-2"
          style={{ color: "rgba(61,43,80,0.5)" }}
        >
          Última regla
        </label>
        <input
          id="lastPeriodStart"
          name="lastPeriodStart"
          type="date"
          data-testid="last-period-input"
          value={lastPeriodStart}
          onChange={(e) => setLastPeriodStart(e.target.value)}
          required
          className="w-full box-border px-3.5 py-3 rounded-xl text-[14.5px] mb-4.5"
          style={{
            border: "1px solid rgba(61,43,80,0.15)",
            background: "#FAF6F0",
            color: "#3D2B50",
          }}
        />

        <div
          className="rounded-2xl p-4 flex gap-3 items-start mb-4"
          style={{ background: "#EEF2E1" }}
        >
          <Info size={17} color="#7A9142" className="shrink-0 mt-0.5" />
          <div
            data-testid="cycle-info-banner"
            className="text-[13.5px] leading-relaxed"
            style={{ color: "#4d5c30" }}
          >
            Lila usa estos datos para predecir tu ventana fértil y picos de energía.
          </div>
        </div>

        {saveError && (
          <div
            data-testid="cycle-form-error"
            className="text-sm mb-3"
            style={{ color: "#8B3A52" }}
          >
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div
            data-testid="cycle-form-success"
            className="text-sm mb-3"
            style={{ color: "#5f7231" }}
          >
            Guardado.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          data-testid="cycle-form-submit"
          className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "#9B72C8" }}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}

export default CycleCard;
