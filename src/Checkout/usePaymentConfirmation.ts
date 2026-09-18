import { useCallback, useRef, useState } from "react";
import { ConfirmWidgetPaymentError, confirmWidgetPayment } from "@/api/checkout";
import type { PaymentResult } from "./types";

// The BE answers 409 when the subscription is already active (e.g. its webhook got there
// first): the purchase is done, so it is a success for the user, not an error.
const ALREADY_ACTIVE_STATUS = 409;

interface UsePaymentConfirmationArgs {
  planId: string;
  announce: (message: string) => void;
}

// After Wompi reports APPROVED the user has ALREADY been charged: this hook owns telling the BE
// (so the plan gets activated) and the terminal result shown to her, including a retry when the
// confirmation call fails. Retrying only re-calls the BE; it never reopens the widget.
export function usePaymentConfirmation({
  planId,
  announce,
}: UsePaymentConfirmationArgs) {
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const isConfirmingRef = useRef(false);

  const confirm = useCallback(
    // `code` is the one the widget was opened with (not read from live state: it may have moved).
    async (transactionId: string, amountInCents: number, code: string | null) => {
      if (isConfirmingRef.current) return;
      isConfirmingRef.current = true;
      setIsConfirming(true);
      announce("Confirmando tu pago");

      const base = { transactionId, amountInCents, code };
      try {
        await confirmWidgetPayment({ transactionId, planId });
        setResult({ ...base, kind: "approved" });
        announce("Pago aprobado. Tu plan ya está activo");
      } catch (error) {
        const isAlreadyActive =
          error instanceof ConfirmWidgetPaymentError &&
          error.status === ALREADY_ACTIVE_STATUS;
        setResult({
          ...base,
          kind: isAlreadyActive ? "approved" : "confirm_failed",
        });
        announce(
          isAlreadyActive
            ? "Pago aprobado. Tu plan ya está activo"
            : "Recibimos tu pago pero no pudimos activar tu plan",
        );
      } finally {
        isConfirmingRef.current = false;
        setIsConfirming(false);
      }
    },
    [planId, announce],
  );

  const showPending = useCallback(
    (transactionId: string, amountInCents: number, code: string | null) => {
      setResult({ kind: "pending", transactionId, amountInCents, code });
      announce("Estamos confirmando tu pago");
    },
    [announce],
  );

  const retry = useCallback(() => {
    if (result?.kind !== "confirm_failed") return;
    void confirm(result.transactionId, result.amountInCents, result.code);
  }, [result, confirm]);

  return { result, isConfirming, confirm, showPending, retry };
}
