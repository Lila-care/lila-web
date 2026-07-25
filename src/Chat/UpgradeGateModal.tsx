import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { confirmWidgetPayment } from "@/api/subscription";
import { useActivePlan } from "./useActivePlan";
import { useWompiCheckout } from "./useWompiCheckout";

interface UpgradeGateModalProps {
  upgradePromptLimit: number;
  onClose: () => void;
  // Called after a successful checkout so the caller can re-sync `hasActiveSubscription`
  // (e.g. `useLilaChat`'s `refreshSubscriptionStatus`).
  onSubscribed?: () => void;
}

// Seeded plan from ms-lila ("Premium Mensual"): 19.900 COP/month. Hardcoded here for display
// only — the actual charge amount sent to Wompi and the `planId` sent to `createCheckout` are
// resolved separately via `useActivePlan` (`GET /subscription/plans`, public).
const PLAN_PRICE_LABEL = "$19.900/mes";
const PLAN_AMOUNT_IN_CENTS = 1_990_000;

export default function UpgradeGateModal({
  onClose,
  onSubscribed,
}: UpgradeGateModalProps) {
  const { token } = useAuth();
  const { planId, loading: planLoading } = useActivePlan();
  const { isOpening, error: checkoutError, openCheckout } = useWompiCheckout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const busy = isOpening || isSubmitting;
  const canCheckout = !!token && !!planId && !planLoading && !busy;

  const handleUpgrade = async () => {
    if (!token || !planId) return;
    setSubmitError(null);

    const checkoutResult = await openCheckout({
      amountInCents: PLAN_AMOUNT_IN_CENTS,
      reference: `lila-sub-${Date.now()}`,
    });
    // User closed the widget without completing a transaction, or the widget
    // failed to open — `checkoutError` already surfaces why.
    if (!checkoutResult) return;

    // Do not check status client-side — the Wompi widget callback can return
    // "PENDING" even when the UI shows "¡Pago aprobado!", and some methods
    // (Nequi, PSE) are always async. The backend verifies the real status via
    // Wompi's API and returns 402 if the transaction isn't APPROVED yet.
    setIsSubmitting(true);
    try {
      await confirmWidgetPayment(token, {
        transactionId: checkoutResult.transactionId,
        planId,
      });
      onSubscribed?.();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "No se pudo activar la suscripción",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2e2e2e",
          borderRadius: "24px",
          fontFamily: "'Poppins', system-ui, sans-serif",
        }}
        className="w-full max-w-sm p-8 flex flex-col items-center text-center gap-5"
        data-testid="upgrade-gate-modal"
      >
        {/* Logo */}
        <img src="/sello_vinotinto.svg" alt="Lila" className="w-16 h-16" />

        {/* Title */}
        <h2
          className="text-xl font-bold leading-tight"
          style={{ color: "#F8EAFE" }}
        >
          Has llegado a tu límite por ahora
        </h2>

        {/* Subtitle */}
        <p className="text-sm leading-relaxed" style={{ color: "#828282" }}>
          Upgrade tu plan para seguir hablando con Lila sin límites, o vuelve
          mañana.
        </p>

        {/* Primary CTA — real checkout */}
        <button
          onClick={handleUpgrade}
          disabled={!canCheckout}
          data-testid="upgrade-checkout-button"
          className="w-full py-3 rounded-xl text-sm font-semibold transition-colors duration-[180ms] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#7e3565",
            color: "#F8EAFE",
          }}
          onMouseEnter={(e) => {
            if (!canCheckout) return;
            (e.currentTarget as HTMLButtonElement).style.background = "#92407a";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#7e3565";
          }}
        >
          {busy
            ? "Procesando..."
            : `Actualizar a Premium — ${PLAN_PRICE_LABEL}`}
        </button>

        {(checkoutError || submitError) && (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#e08a8a" }}
            data-testid="upgrade-checkout-error"
          >
            {checkoutError ?? submitError}
          </p>
        )}

        {/* Genuine empty state — `GET /subscription/plans` returned no active plan, not an
            auth/permissions error (it's a public endpoint, always 200s with `[]` if empty). */}
        {!planLoading && !planId && (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#828282" }}
            data-testid="upgrade-plan-unavailable"
          >
            La suscripción no está disponible en este momento.
          </p>
        )}

        {/* Secondary link */}
        <button
          onClick={onClose}
          className="text-sm underline transition-opacity hover:opacity-70"
          style={{ color: "#828282" }}
        >
          Volver mañana
        </button>
      </div>
    </div>
  );
}
