import type {
  AccountStatus,
  AttentionReason,
  AuthProvider,
  DashboardUserListItemDto,
  SubscriptionStatus,
  TimelineMilestoneKey,
  UserStage,
} from "@/api/users";
import { formatCount } from "@/Admin/dashboardFormat";
import type { StageMarkerVariant } from "@/Admin/ledger/StageMarker";

// All BE enums are shown as Spanish copy — a raw enum value never reaches the UI.

export const USER_STAGES: UserStage[] = [
  "unconfirmed",
  "no_onboarding",
  "onboarding_in_progress",
  "onboarding_completed",
  "subscribed",
];

// Short labels for the stage filter; rows use `describeStage` (adds "pregunta N de M").
export const STAGE_FILTER_LABELS: Record<UserStage, string> = {
  unconfirmed: "Sin confirmar",
  no_onboarding: "Sin onboarding",
  onboarding_in_progress: "Onboarding en curso",
  onboarding_completed: "Onboarding completo",
  subscribed: "Con plan",
};

// Figma StageMarker: ring for the two "nothing yet" stages (the label tells them apart).
export const STAGE_MARKERS: Record<UserStage, StageMarkerVariant> = {
  unconfirmed: "ring",
  no_onboarding: "ring",
  onboarding_in_progress: "half",
  onboarding_completed: "filled",
  subscribed: "teal",
};

export function describeStage(user: DashboardUserListItemDto): string {
  if (user.stage === "onboarding_in_progress" && user.onboarding) {
    const { currentQuestionIndex, totalQuestions } = user.onboarding;
    return `Onboarding en pregunta ${currentQuestionIndex} de ${totalQuestions}`;
  }
  return STAGE_FILTER_LABELS[user.stage];
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  unconfirmed: "Sin confirmar",
  confirmed: "Confirmada",
  force_change_password: "Debe cambiar contraseña",
};

export const PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: "Google",
  password: "contraseña",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
  none: "Sin suscripción",
};

// The BE doesn't flag typos: an unconfirmed account whose email ends in ".con" is almost
// certainly a mistyped ".com" (the only typo the product asked to surface).
export function looksLikeEmailTypo(user: DashboardUserListItemDto): boolean {
  return user.accountStatus === "unconfirmed" && !!user.email?.endsWith(".con");
}

export const EMAIL_TYPO_HINT = "¿posible error de tipeo?";

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function describeAttentionReason(
  user: DashboardUserListItemDto,
  reason: AttentionReason,
): string {
  switch (reason) {
    case "unconfirmed_email":
      return looksLikeEmailTypo(user)
        ? `Email sin confirmar · ${EMAIL_TYPO_HINT}`
        : "Email sin confirmar";
    case "onboarding_stalled":
      return user.onboarding
        ? `Onboarding detenido en la pregunta ${user.onboarding.currentQuestionIndex} de ${user.onboarding.totalQuestions}`
        : "Onboarding detenido";
    case "checkout_abandoned":
      return `Abrió el pago pero no lo completó (${pluralize(user.checkoutAttempts, "intento", "intentos")})`;
    case "past_due":
      return "Pago vencido";
    case "inactive_24h":
      return "Registrada hace más de 24 h sin actividad";
  }
}

// Marker per reason, verified against the Figma frames: unconfirmed = ring, stalled /
// checkout = half, past due = half, 24 h inactive = ring.
export const ATTENTION_MARKERS: Record<AttentionReason, StageMarkerVariant> = {
  unconfirmed_email: "ring",
  onboarding_stalled: "half",
  checkout_abandoned: "half",
  past_due: "half",
  inactive_24h: "ring",
};

// "Se detuvo acá" only makes sense inside the onboarding funnel; for later milestones a missing
// one is just "Aún no" (a user with no payment attempt didn't "stop" anywhere).
const HIGHLIGHTABLE_MILESTONES: TimelineMilestoneKey[] = [
  "confirmed",
  "onboarding_started",
  "onboarding_question_reached",
  "onboarding_completed",
];

export function isStoppedHighlight(
  key: TimelineMilestoneKey,
  stoppedAt: TimelineMilestoneKey | null,
): boolean {
  return key === stoppedAt && HIGHLIGHTABLE_MILESTONES.includes(key);
}

export const MILESTONE_LABELS: Record<TimelineMilestoneKey, string> = {
  registered: "Registrada",
  confirmed: "Cuenta confirmada",
  onboarding_started: "Onboarding iniciado",
  onboarding_question_reached: "Pregunta alcanzada",
  onboarding_completed: "Onboarding completo",
  first_cycle_report: "Primer reporte de ciclo",
  first_conversation: "Primera conversación con Lila",
  checkout_attempt: "Intento de pago",
  subscription: "Suscripción activa",
};

// "7/18" → "Pregunta 7 de 18 alcanzada".
export function describeMilestone(
  key: TimelineMilestoneKey,
  detail?: string,
): string {
  if (key === "onboarding_question_reached" && detail) {
    const [current, total] = detail.split("/");
    if (current && total) return `Pregunta ${current} de ${total} alcanzada`;
  }
  return MILESTONE_LABELS[key];
}

// Registered users who never finished onboarding have no profile yet.
export function hasPendingOnboarding(stage: UserStage): boolean {
  return (
    stage === "unconfirmed" ||
    stage === "no_onboarding" ||
    stage === "onboarding_in_progress"
  );
}

// "1 reporte" / "N reportes" for the stacked list line ("conv." is an abbreviation, no plural).
export function describeCycleReports(count: number): string {
  return `${formatCount(count)} ${count === 1 ? "reporte" : "reportes"}`;
}

// Panel meta: "Sin tiers aún" while the profile has none, else the tiers joined.
export function describeTiers(tiers: string[]): string {
  return tiers.length === 0 ? "Sin tiers aún" : tiers.join(", ");
}
