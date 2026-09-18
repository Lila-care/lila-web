import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCop } from "./formatCop";
import type { AppliedDiscount, CodeFieldStatus } from "./types";

export type FeedbackTone = "success" | "error" | "warning";

export interface Feedback {
  Icon: LucideIcon;
  tone: FeedbackTone;
  message: string;
}

// Each state has its own icon AND copy: color is never the only channel.
export function describeFeedback(
  status: CodeFieldStatus,
  applied: AppliedDiscount | null,
): Feedback | null {
  switch (status) {
    case "valid":
      return {
        Icon: CheckCircle2,
        tone: "success",
        message: `Código ${applied?.code ?? ""} aplicado: -${formatCop(applied?.discountInCents ?? 0)}`,
      };
    case "invalid":
      return {
        Icon: AlertCircle,
        tone: "error",
        message: "Este código no es válido. Revisa que esté bien escrito.",
      };
    case "expired":
      return { Icon: Clock, tone: "warning", message: "Este código ya expiró." };
    case "below_minimum":
      return {
        Icon: AlertCircle,
        tone: "error",
        message: "Este código deja el total por debajo del mínimo de pago.",
      };
    case "unavailable":
      return {
        Icon: AlertCircle,
        tone: "error",
        message:
          "No pudimos validar tu código ahora. Puedes intentarlo de nuevo o pagar sin código.",
      };
    case "unsaved":
      return {
        Icon: AlertCircle,
        tone: "error",
        message: "Aplica tu código o bórralo antes de pagar.",
      };
    default:
      return null;
  }
}

export const TONE_TEXT: Record<FeedbackTone, string> = {
  success: "text-feedback-success-text",
  error: "text-feedback-error-text",
  warning: "text-feedback-warning-text",
};

export const TONE_BORDER: Record<FeedbackTone, string> = {
  success: "border-feedback-success-border",
  error: "border-feedback-error-border",
  warning: "border-feedback-warning-border",
};

