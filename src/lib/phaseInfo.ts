import type { PhaseName } from "@/api/cycleTracking";

// Copy y colores compartidos por fase — usado en Hoy, Calendario y Aprende para no duplicar
// el mismo mapping de PhaseName -> presentación en cada pantalla.
export interface PhaseInfo {
  label: string;
  dotColor: string;
  textColor: string;
  gradient: string;
}

export const PHASE_INFO: Record<PhaseName, PhaseInfo> = {
  MENSTRUATION: {
    label: "Fase menstrual",
    dotColor: "#8B3A52",
    textColor: "#8B3A52",
    gradient: "linear-gradient(135deg, #8B3A52 0%, #a8506a 55%, #c47b8e 100%)",
  },
  FOLLICULAR: {
    label: "Fase folicular",
    dotColor: "#B5C26A",
    textColor: "#5f7231",
    gradient: "linear-gradient(135deg, #B5C26A, #c7d189 60%, #dbe3ae)",
  },
  OVULATION: {
    label: "Fase ovulatoria",
    dotColor: "#9B72C8",
    textColor: "#6c4a91",
    gradient: "linear-gradient(135deg, #9B72C8, #ab86d1 60%, #c4a8e0)",
  },
  LUTEAL: {
    label: "Fase lútea",
    dotColor: "#F0C4A8",
    textColor: "#a8683a",
    gradient: "linear-gradient(135deg, #F0C4A8, #f2d3bd 60%, #f5e0d2)",
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
