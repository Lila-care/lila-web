import { ChatApiError } from "@/api/lila";

// Why the upgrade modal is open. `generic` is the client-side counter (upgradePromptLimit) and
// any older 403 that only said `upgradeRequired`.
export type UpgradeGateReason = "daily_limit" | "ai_reports" | "generic";

export interface UpgradeGate {
  reason: UpgradeGateReason;
  // Daily quota the BE reported (LIMIT_REACHED), when it sent one.
  limit: number | null;
}

export const GENERIC_UPGRADE_GATE: UpgradeGate = {
  reason: "generic",
  limit: null,
};

export type ChatGateOutcome =
  | { kind: "upgrade"; gate: UpgradeGate }
  | { kind: "login" }
  | { kind: "none" };

// Maps a chat failure to the modal to show. For guests any plan gate (coded or legacy) opens
// the login gate. For signed-in users 403s with a known code win; a legacy 403 with only
// `upgradeRequired` opens the generic upgrade modal. Anything else stays a plain inline error.
export function resolveChatGate(
  error: unknown,
  isSignedIn: boolean,
): ChatGateOutcome {
  if (!(error instanceof ChatApiError) || error.status !== 403) {
    return { kind: "none" };
  }
  const { code, feature, limit, upgradeRequired } = error.gate;
  // The BE also answers LIMIT_REACHED / FEATURE_NOT_IN_PLAN to guests: they have no plan to
  // upgrade, so the way forward is signing in.
  if (!isSignedIn && (code || upgradeRequired)) return { kind: "login" };
  if (code === "LIMIT_REACHED" && feature === "daily_chat_messages") {
    return {
      kind: "upgrade",
      gate: { reason: "daily_limit", limit: limit ?? null },
    };
  }
  if (code === "FEATURE_NOT_IN_PLAN" && feature === "ai_reports") {
    return { kind: "upgrade", gate: { reason: "ai_reports", limit: null } };
  }
  if (upgradeRequired) return { kind: "upgrade", gate: GENERIC_UPGRADE_GATE };
  return { kind: "none" };
}

interface UpgradeGateCopy {
  title: string;
  body: string;
  primary: string;
  secondary: string;
}

// The daily quota resets at midnight Bogotá time (UTC-5, no DST).
export function describeUpgradeGate(gate: UpgradeGate): UpgradeGateCopy {
  switch (gate.reason) {
    case "daily_limit":
      return {
        title: "Llegaste al límite de mensajes de hoy",
        body: `${
          gate.limit === null
            ? "Usaste todos tus mensajes de hoy."
            : `Usaste tus ${gate.limit} mensajes de hoy.`
        } Tu cupo se reinicia mañana a la medianoche (hora de Bogotá). Si quieres seguir hablando con Lila ahora, mejora tu plan.`,
        primary: "Mejorar mi plan",
        secondary: "Volver mañana",
      };
    case "ai_reports":
      return {
        title: "Los reportes del ciclo son parte de un plan de pago",
        body: "Mejora tu plan para que Lila pueda prepararte reportes de tu ciclo.",
        primary: "Mejorar mi plan",
        secondary: "Ahora no",
      };
    case "generic":
      return {
        title: "Has llegado a tu límite por ahora",
        body: "Upgrade tu plan para seguir hablando con Lila sin límites, o vuelve mañana.",
        primary: "Mejorar mi plan",
        secondary: "Volver mañana",
      };
  }
}
