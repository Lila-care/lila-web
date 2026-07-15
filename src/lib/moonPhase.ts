// Cálculo 100% client-side de la fase lunar — no hay endpoint de backend para esto (gap
// documentado en el contrato técnico). Basado en el algoritmo estándar de edad lunar: días
// transcurridos desde una luna nueva de referencia conocida, módulo el período sinódico
// (29.53058867 días).
const SYNODIC_MONTH_DAYS = 29.53058867;
// Luna nueva de referencia conocida (2000-01-06 18:14 UTC).
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export type MoonPhaseName =
  | "Luna nueva"
  | "Luna creciente"
  | "Cuarto creciente"
  | "Luna gibosa creciente"
  | "Luna llena"
  | "Luna gibosa menguante"
  | "Cuarto menguante"
  | "Luna menguante";

export interface MoonPhaseResult {
  phaseName: MoonPhaseName;
  illumination: number; // 0-100, redondeado
  ageDays: number; // 0 - 29.53
}

function moonAgeDays(date: Date): number {
  const diffMs = date.getTime() - KNOWN_NEW_MOON;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const age = diffDays % SYNODIC_MONTH_DAYS;
  return age < 0 ? age + SYNODIC_MONTH_DAYS : age;
}

function phaseNameFromAge(age: number): MoonPhaseName {
  const fraction = age / SYNODIC_MONTH_DAYS;
  if (fraction < 0.03 || fraction >= 0.97) return "Luna nueva";
  if (fraction < 0.22) return "Luna creciente";
  if (fraction < 0.28) return "Cuarto creciente";
  if (fraction < 0.47) return "Luna gibosa creciente";
  if (fraction < 0.53) return "Luna llena";
  if (fraction < 0.72) return "Luna gibosa menguante";
  if (fraction < 0.78) return "Cuarto menguante";
  return "Luna menguante";
}

// Iluminación aproximada usando (1 - cos(2*pi*fraction)) / 2, estándar para este tipo de cálculo.
function illuminationFromAge(age: number): number {
  const fraction = age / SYNODIC_MONTH_DAYS;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  return Math.round(illumination * 100);
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseResult {
  const ageDays = moonAgeDays(date);
  return {
    phaseName: phaseNameFromAge(ageDays),
    illumination: illuminationFromAge(ageDays),
    ageDays,
  };
}
