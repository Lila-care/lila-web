import { FeatureSection, FeatureUnit } from "@/api/plans";

export const SECTION_ORDER: readonly FeatureSection[] = [
  "chat",
  "learn",
  "cycle",
];

export const SECTION_LABEL: Record<FeatureSection, string> = {
  chat: "Conversación con Lila",
  learn: "Aprende",
  cycle: "Ciclo y salud",
};

// Short unit as shown next to a limit input.
export const UNIT_LABEL: Record<FeatureUnit, string> = {
  per_day: "por día",
  per_month: "por mes",
  days: "días",
  cycles: "ciclos",
  profiles: "perfiles",
};
