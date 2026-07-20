import AppShell from "@/components/AppShell/AppShell";
import PhaseSection from "@/Aprende/PhaseSection";

// Colores duplicados intencionalmente de src/lib/phaseInfo.ts (mismo criterio documentado ahí:
// "usado en Hoy, Calendario y Aprende") — mantené ambos en sync si cambia una rampa de fase.
const PHASES = [
  {
    dayRange: "Días 1–5",
    title: "Fase menstrual",
    description:
      "El cuerpo suelta lo que ya no necesita. La energía baja, y eso está bien — no hay nada que forzar esta semana.",
    rituals: ["Descanso sin culpa", "Calor en el vientre", "Hidratación constante"],
    gradient:
      "linear-gradient(135deg, var(--color-phase-menstrual) 0%, var(--plum-600) 55%, var(--plum-500) 100%)",
    textColor: "#fff",
    chipBackground: "rgba(255,255,255,0.18)",
    ritualBackground: "rgba(255,255,255,0.14)",
  },
  {
    dayRange: "Días 6–13",
    title: "Fase folicular",
    description:
      "La energía empieza a subir. Es un buen momento para planear, aprender algo nuevo y moverte más.",
    rituals: ["Movimiento activo", "Planear proyectos", "Probar algo nuevo"],
    gradient:
      "linear-gradient(135deg, var(--color-phase-folicular), var(--forest-600) 60%, var(--forest-500))",
    textColor: "#fff",
    chipBackground: "rgba(255,255,255,0.18)",
    ritualBackground: "rgba(255,255,255,0.14)",
  },
  {
    dayRange: "Días 14–16",
    title: "Fase ovulatoria",
    description:
      "El pico de energía del ciclo. Te sientes más segura, más sociable — buen momento para conversaciones importantes.",
    rituals: ["Conexión con otros", "Creatividad libre", "Conversaciones clave"],
    gradient:
      "linear-gradient(135deg, var(--coral-700), var(--coral-600) 60%, var(--color-phase-ovulatoria))",
    textColor: "#fff",
    chipBackground: "rgba(255,255,255,0.18)",
    ritualBackground: "rgba(255,255,255,0.14)",
  },
  {
    dayRange: "Días 17–28",
    title: "Fase lútea",
    description:
      "La energía baja poco a poco. El cuerpo pide orden y calma antes de empezar de nuevo.",
    rituals: ["Organizar pendientes", "Bajar el ritmo", "Dormir más temprano"],
    gradient:
      "linear-gradient(135deg, var(--orchid-700), var(--orchid-600) 60%, var(--color-phase-lutea))",
    textColor: "#fff",
    chipBackground: "rgba(255,255,255,0.18)",
    ritualBackground: "rgba(255,255,255,0.14)",
  },
];

// Contenido 100% estático — sin llamadas a API, tal como el mock de Fases.dc.html.
function AprendePage() {
  return (
    <AppShell>
      <div className="px-6 md:px-16 pt-14 pb-6">
        <div
          className="text-[12.5px] font-semibold uppercase tracking-wider mb-2.5"
          style={{ color: "rgba(61,43,80,0.45)" }}
        >
          Aprende
        </div>
        <h1
          className="font-bold text-3xl md:text-[40px] mb-3 -tracking-[0.5px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Las cuatro fases
        </h1>
        <p
          className="text-[15.5px] leading-relaxed max-w-[560px]"
          style={{ color: "rgba(61,43,80,0.6)" }}
        >
          Tu ciclo no es lineal — cada fase trae su propia energía. Conocerlas te ayuda a
          moverte con tu cuerpo, no contra él.
        </p>
      </div>

      {PHASES.map((phase) => (
        <PhaseSection key={phase.title} {...phase} />
      ))}
    </AppShell>
  );
}

export default AprendePage;
