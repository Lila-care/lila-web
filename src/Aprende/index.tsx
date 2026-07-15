import AppShell from "@/components/AppShell/AppShell";
import PhaseSection from "@/Aprende/PhaseSection";

const PHASES = [
  {
    dayRange: "Días 1–5",
    title: "Fase menstrual",
    description:
      "El cuerpo suelta lo que ya no necesita. La energía baja, y eso está bien — no hay nada que forzar esta semana.",
    rituals: ["Descanso sin culpa", "Calor en el vientre", "Hidratación constante"],
    gradient: "linear-gradient(135deg, #8B3A52, #a8506a 60%, #c47b8e)",
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
    gradient: "linear-gradient(135deg, #B5C26A, #c7d189 60%, #dbe3ae)",
    textColor: "#37401f",
    chipBackground: "rgba(55,64,31,0.12)",
    ritualBackground: "rgba(55,64,31,0.1)",
  },
  {
    dayRange: "Días 14–16",
    title: "Fase ovulatoria",
    description:
      "El pico de energía del ciclo. Te sientes más segura, más sociable — buen momento para conversaciones importantes.",
    rituals: ["Conexión con otros", "Creatividad libre", "Conversaciones clave"],
    gradient: "linear-gradient(135deg, #9B72C8, #ab86d1 60%, #c4a8e0)",
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
    gradient: "linear-gradient(135deg, #F0C4A8, #f2d3bd 60%, #f5e0d2)",
    textColor: "#5a3a26",
    chipBackground: "rgba(90,58,38,0.1)",
    ritualBackground: "rgba(90,58,38,0.1)",
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
