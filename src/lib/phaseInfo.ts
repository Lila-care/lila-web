import type { PhaseName } from "@/api/cycleTracking";

// Copy y colores compartidos por fase — usado en Today, Calendar y Learn para no duplicar
// el mismo mapping de PhaseName -> presentación en cada pantalla.
export interface PhaseInfo {
  label: string;
  dotColor: string;
  textColor: string;
  gradient: string;
}

// Colores por fase alineados a los tokens de src/index.css (--color-phase-*, y las rampas
// --plum-*/--forest-*/--coral-*/--orchid-* que los respaldan). dotColor usa el tono "firma" de
// cada fase tal cual está definido en el token (plum-700/forest-700/coral-400/orchid-400) — se
// usa en elementos chicos (punto de leyenda, ícono de luna, badge) donde no aplica el mínimo de
// contraste de texto. gradient en cambio arranca/termina en un tramo más oscuro de la misma
// rampa (700/600/500 o 700/600/400) para que el texto blanco fijo de PhaseHeroCard/
// DayDetailPanel (`text-white` hardcodeado, no lee `textColor`) siga siendo legible — un
// degradado pastel ahí dejaría el texto casi invisible (ver nota de NO_PHASE_INFO abajo, que ya
// tuvo ese bug antes). Contraste (WCAG, texto blanco):
//   plum-700 8.13:1 · plum-600 5.71:1 · plum-500 4.08:1
//   forest-700 5.2:1 · forest-600 3.37:1 · forest-500 2.49:1
//   coral-700 7.29:1 · coral-600 4.95:1 · coral-400 2.87:1
//   orchid-700 8.4:1 · orchid-600 6.01:1 · orchid-400 2.98:1
// El último stop de ovulatoria/lútea queda por debajo de 4.5:1 igual que en el degradado
// anterior (su lightest stop tampoco pasaba AA) — no es una regresión, y textColor (usado en
// MonthGrid sobre fondos casi blancos) sí cumple AA holgadamente en los 4 casos.
export const PHASE_INFO: Record<PhaseName, PhaseInfo> = {
  MENSTRUATION: {
    label: "Fase menstrual",
    dotColor: "var(--color-phase-menstrual)",
    textColor: "var(--plum-800)",
    gradient:
      "linear-gradient(135deg, var(--color-phase-menstrual) 0%, var(--plum-600) 55%, var(--plum-500) 100%)",
  },
  FOLLICULAR: {
    label: "Fase folicular",
    dotColor: "var(--color-phase-follicular)",
    textColor: "var(--forest-800)",
    gradient:
      "linear-gradient(135deg, var(--color-phase-follicular), var(--forest-600) 60%, var(--forest-500))",
  },
  OVULATION: {
    label: "Fase ovulatoria",
    dotColor: "var(--color-phase-ovulatory)",
    textColor: "var(--coral-700)",
    gradient:
      "linear-gradient(135deg, var(--coral-700), var(--coral-600) 60%, var(--color-phase-ovulatory))",
  },
  LUTEAL: {
    label: "Fase lútea",
    dotColor: "var(--color-phase-luteal)",
    textColor: "var(--orchid-700)",
    gradient:
      "linear-gradient(135deg, var(--orchid-700), var(--orchid-600) 60%, var(--color-phase-luteal))",
  },
};

// Fallback para "sin datos de fase" (phase === null) — plum/mauve neutro derivado de la
// paleta de marca (#3D2B50 / #9B72C8), distinto de los 4 colores de fase reales para que no se
// confunda con MENSTRUATION/FOLLICULAR/OVULATION/LUTEAL. Reemplaza un fallback anterior
// pastel/translúcido (rgba(61,43,80,0.15) + gradiente casi blanco) que dejaba texto blanco
// prácticamente invisible en PhaseHeroCard y DayDetailPanel cuando no había datos de ciclo.
// Contraste verificado (fórmula de luminancia relativa WCAG) con texto blanco encima — los 3
// tonos sólidos del gradiente cumplen individualmente el mínimo AA de 4.5:1:
//   #5C4D73 → 7.59:1   #6B5C7D → 6.08:1   #7A6B92 → 4.83:1
export const NO_PHASE_INFO: PhaseInfo = {
  label: "Sin datos de fase",
  dotColor: "#6B5C7D",
  textColor: "#5C4D73",
  gradient: "linear-gradient(135deg, #5C4D73 0%, #6B5C7D 55%, #7A6B92 100%)",
};

export function getPhaseInfo(phase: PhaseName | null): PhaseInfo {
  if (!phase) {
    return NO_PHASE_INFO;
  }
  return PHASE_INFO[phase];
}
