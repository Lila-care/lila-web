import { Link } from "wouter";
import { MessageCircle, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell/AppShell";
import { useHoy } from "@/Hoy/useHoy";
import PhaseHeroCard from "@/Hoy/PhaseHeroCard";
import WeekStrip from "@/Hoy/WeekStrip";

function formatToday(): string {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function HoyPage() {
  const { summary, week, today, loading, error } = useHoy();

  return (
    <AppShell>
      <main className="px-6 md:px-16 pt-14 pb-16 max-w-[980px]">
        <div className="text-sm mb-1.5 capitalize" style={{ color: "rgba(61,43,80,0.55)" }}>
          {formatToday()}
        </div>
        <h1
          className="font-bold text-3xl md:text-[40px] mb-8 -tracking-[0.5px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Hola de nuevo
        </h1>

        {loading && (
          <div
            data-testid="hoy-loading"
            className="bg-white rounded-3xl p-10 mb-7 animate-pulse"
            style={{ border: "1px solid rgba(61,43,80,0.07)" }}
          >
            <div className="h-6 w-40 bg-black/5 rounded mb-4" />
            <div className="h-10 w-32 bg-black/5 rounded" />
          </div>
        )}

        {!loading && error && (
          <div
            data-testid="hoy-error"
            className="bg-white rounded-3xl p-8 mb-7 text-sm"
            style={{
              border: "1px solid rgba(139,58,82,0.2)",
              color: "#8B3A52",
            }}
          >
            No pudimos cargar tu ciclo. {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <PhaseHeroCard
              phase={today?.phaseName ?? null}
              cycleDay={summary?.cycle?.currentCycleDay ?? summary?.activePeriod?.day ?? null}
            />

            <div
              className="text-[12.5px] font-semibold uppercase tracking-wider mb-3.5"
              style={{ color: "rgba(61,43,80,0.45)" }}
            >
              Qué quieres hacer hoy
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-9">
              <Link
                href="/chat"
                data-testid="quick-action-chat"
                className="block bg-white rounded-3xl p-6"
                style={{
                  border: "1px solid rgba(61,43,80,0.07)",
                  boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#F3EDF7" }}
                >
                  <MessageCircle size={21} color="#9B72C8" />
                </div>
                <div
                  className="font-semibold text-lg mb-1.5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Hablar con Lila
                </div>
                <div className="text-[13.5px] leading-relaxed" style={{ color: "rgba(61,43,80,0.6)" }}>
                  Cuéntale cómo te sientes hoy.
                </div>
              </Link>

              <button
                type="button"
                disabled
                title="Próximamente"
                data-testid="quick-action-symptoms"
                className="block text-left bg-white rounded-3xl p-6 cursor-not-allowed opacity-60"
                style={{
                  border: "1px solid rgba(61,43,80,0.07)",
                  boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#FBEFE6" }}
                >
                  <Sparkles size={21} color="#C97C46" />
                </div>
                <div
                  className="font-semibold text-lg mb-1.5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Registrar síntomas
                </div>
                <div className="text-[13.5px] leading-relaxed" style={{ color: "rgba(61,43,80,0.6)" }}>
                  Próximamente.
                </div>
              </button>
            </div>

            <WeekStrip week={week} />
          </>
        )}
      </main>
    </AppShell>
  );
}

export default HoyPage;
