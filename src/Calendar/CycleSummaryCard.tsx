import type { ReactNode } from "react";
import { Calendar, ChevronRight, Info } from "lucide-react";
import { useLocation } from "wouter";
import { usePeriodSummary } from "@/hooks/usePeriodSummary";
import { getPhaseInfo, NO_PHASE_INFO } from "@/lib/phaseInfo";

// Duplicada intencionalmente desde DayDetailPanel.tsx (una sola línea de lógica real) — no
// amerita un util compartido para dos usos; ver contrato técnico de este feature.
function formatLongDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
  });
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="cycle-summary-card"
      role="region"
      aria-label="Resumen de tu perfil de ciclo"
      className="bg-white rounded-3xl p-6"
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
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: "1px solid rgba(61,43,80,0.08)" }}
    >
      <div
        className="text-[12px] font-semibold uppercase tracking-wide"
        style={{ color: "rgba(61,43,80,0.5)" }}
      >
        {label}
      </div>
      <div className="text-[14.5px] font-medium" style={{ color: "#3D2B50" }}>
        {value}
      </div>
    </div>
  );
}

function CycleSummaryCard() {
  const { summary, loading, error, refetch } = usePeriodSummary();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div
        data-testid="cycle-summary-card"
        role="region"
        aria-label="Resumen de tu perfil de ciclo"
        aria-live="polite"
        className="bg-white rounded-3xl p-6 animate-pulse"
        style={{ border: "1px solid rgba(61,43,80,0.07)" }}
      >
        <div
          className="h-6 w-32 rounded mb-5"
          style={{ background: "rgba(61,43,80,0.08)" }}
        />
        <div
          className="h-4 w-full rounded mb-3"
          style={{ background: "rgba(61,43,80,0.08)" }}
        />
        <div
          className="h-4 w-full rounded mb-3"
          style={{ background: "rgba(61,43,80,0.08)" }}
        />
        <div
          className="h-4 w-3/4 rounded"
          style={{ background: "rgba(61,43,80,0.08)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="cycle-summary-card-error"
        role="region"
        aria-label="Resumen de tu perfil de ciclo"
        className="bg-white rounded-3xl p-6 text-sm"
        style={{ border: "1px solid rgba(139,58,82,0.2)", color: "#8B3A52" }}
      >
        No pudimos cargar el resumen de tu ciclo. {error}
        <button
          type="button"
          onClick={refetch}
          data-testid="cycle-summary-retry"
          className="block mt-3 font-semibold underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // `summary` es `null` tanto para un guest (sin token, el fetch nunca corre) como para una
  // usuaria autenticada que nunca guardó su ciclo en Perfil (el BE devuelve los 3 campos en
  // `null`) — ambos casos son "no hay datos que mostrar" y deben caer en el mismo empty state,
  // no en el branch de abajo con fallbacks campo por campo.
  const isEmpty =
    !summary ||
    (summary.lastPeriod === null &&
      summary.cycle === null &&
      summary.activePeriod === null);

  if (isEmpty) {
    return (
      <CardShell>
        <div className="flex gap-3 items-start mb-4">
          <Info
            size={18}
            color={NO_PHASE_INFO.dotColor}
            className="shrink-0 mt-0.5"
          />
          <p
            data-testid="cycle-summary-empty"
            className="text-[14px] leading-relaxed"
            style={{ color: NO_PHASE_INFO.textColor }}
          >
            Todavía no configuraste los datos de tu ciclo. Por eso el calendario
            no muestra fases todavía.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          data-testid="cycle-summary-configure-cta"
          className="w-full py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: "#9B72C8" }}
        >
          Configurar mi ciclo
        </button>
      </CardShell>
    );
  }

  const cycle = summary?.cycle;
  const activePeriod = summary?.activePeriod;
  const fertileWindow =
    cycle?.fertileWindowStart && cycle?.fertileWindowEnd
      ? { start: cycle.fertileWindowStart, end: cycle.fertileWindowEnd }
      : null;

  return (
    <CardShell>
      {activePeriod?.isActive ? (
        <div
          className="flex items-center gap-2 py-3"
          data-testid="cycle-summary-active-period-badge"
          style={{ borderBottom: "1px solid rgba(61,43,80,0.08)" }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: getPhaseInfo("MENSTRUATION").dotColor }}
          />
          <span
            className="text-[14.5px] font-medium"
            style={{ color: "#3D2B50" }}
          >
            En tu período · día {activePeriod.day}
          </span>
        </div>
      ) : (
        <SummaryRow
          label="Día del ciclo"
          value={
            <span data-testid="cycle-summary-day">
              {cycle?.currentCycleDay != null
                ? `Día ${cycle.currentCycleDay} de tu ciclo`
                : "Sin datos"}
            </span>
          }
        />
      )}

      <SummaryRow
        label="Duración promedio"
        value={
          <span data-testid="cycle-summary-average-length">
            {cycle?.averageLength} días
          </span>
        }
      />

      <SummaryRow
        label="Próximo período"
        value={
          <span data-testid="cycle-summary-next-period">
            {cycle?.predictedNextStart
              ? formatLongDate(cycle.predictedNextStart)
              : "Sin datos"}
          </span>
        }
      />

      {fertileWindow && (
        <SummaryRow
          label="Ventana fértil"
          value={
            <span data-testid="cycle-summary-fertile-window">
              {formatLongDate(fertileWindow.start)} –{" "}
              {formatLongDate(fertileWindow.end)}
            </span>
          }
        />
      )}

      <button
        type="button"
        onClick={() => navigate("/profile")}
        data-testid="cycle-summary-link"
        className="flex items-center gap-1 mt-4 text-sm font-semibold"
        style={{ color: "#9B72C8" }}
      >
        Ver perfil completo <ChevronRight size={15} />
      </button>
    </CardShell>
  );
}

export default CycleSummaryCard;
