import { useCallback, useEffect, useRef, useState } from "react";
import { CheckoutQuoteError, type PlanDto } from "@/api/checkout";
import { formatCop } from "./formatCop";
import { requestPaymentParams, type PaymentParams } from "./requestPaymentParams";
import { usePaymentConfirmation } from "./usePaymentConfirmation";
import { useWidgetAbandonWatchdog } from "./useWidgetAbandonWatchdog";
import { useWompiWidget } from "./useWompiWidget";
import type { PayStatus, PaymentOutcome, WidgetResult } from "./types";

interface UsePaymentArgs {
  plan: PlanDto;
  userId: string | null;
  // Applied code, or null. Sent with the fresh quote requested when opening the widget.
  appliedCode: string | null;
  // Total currently shown on screen; a fresh quote that disagrees is never silently charged.
  displayedTotalInCents: number;
  // `forCode` is the code the disagreeing quote was requested with.
  onTotalMismatch: (amountInCents: number, forCode: string | null) => void;
  onCodeRejected: (error: CheckoutQuoteError) => void;
  announce: (message: string) => void;
}

// Orchestrates "Pagar": fresh quote -> Wompi widget -> confirmation. Never opens the widget
// with anything but the exact values of the quote it just got.
export function usePayment({
  plan,
  userId,
  appliedCode,
  displayedTotalInCents,
  onTotalMismatch,
  onCodeRejected,
  announce,
}: UsePaymentArgs) {
  const {
    status: widgetStatus,
    retry: retryWidgetScript,
    open: openWidgetModal,
  } = useWompiWidget();
  const confirmation = usePaymentConfirmation({
    planId: plan.planId,
    announce,
  });
  const [attemptStatus, setAttemptStatus] = useState<PayStatus>("idle");
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);
  // Each attempt creates a quote (and can charge): block re-entry until it settles. Also the
  // lock the code field checks, so a code can't change while a quote/payment is in flight.
  const isBusyRef = useRef(false);
  // Bumped on every `pay`. A widget can call back late (e.g. after the watchdog already unlocked
  // its attempt): such a callback must not touch the state of a newer attempt.
  const attemptIdRef = useRef(0);
  // What the screen shows RIGHT NOW. `pay` is async: after its `await` the closure values are
  // stale, so the comparison against the fresh quote reads from here instead.
  const latestRef = useRef({ appliedCode, displayedTotalInCents });

  useEffect(() => {
    latestRef.current = { appliedCode, displayedTotalInCents };
  });

  const settleAttempt = useCallback(() => {
    isBusyRef.current = false;
    setAttemptStatus("idle");
  }, []);

  const finishAttempt = useCallback(
    (nextOutcome: PaymentOutcome | null, shouldFocusPayButton = true) => {
      settleAttempt();
      setOutcome(nextOutcome);
      // Don't rely on Wompi's overlay handing focus back.
      if (shouldFocusPayButton) payButtonRef.current?.focus();
    },
    [settleAttempt],
  );

  // The widget was opened for `code` in attempt `attemptId`: that code (not whatever is applied
  // by the time it answers) is what the result screen reports. A callback from an OLD attempt
  // never changes the UI state of the current one, except APPROVED: the user was already charged,
  // so the BE must still be told.
  const handleWidgetResult = useCallback(
    (
      widgetResult: WidgetResult,
      params: PaymentParams,
      code: string | null,
      attemptId: number,
    ) => {
      const isCurrentAttempt = () => attemptId === attemptIdRef.current;
      const transaction = widgetResult.transaction;
      if (!transaction) {
        if (isCurrentAttempt()) finishAttempt("closed");
      } else if (transaction.status === "APPROVED") {
        void confirmation
          .confirm(transaction.id, params.amountInCents, code)
          .finally(() => {
            if (isCurrentAttempt()) settleAttempt();
          });
      } else if (transaction.status === "PENDING") {
        confirmation.showPending(transaction.id, params.amountInCents, code);
        if (isCurrentAttempt()) settleAttempt();
      } else if (isCurrentAttempt()) {
        finishAttempt("declined");
      }
    },
    [confirmation, finishAttempt, settleAttempt],
  );

  // If Wompi's overlay disappears without calling back, unlock "Pagar" when the tab regains focus.
  const captureOverlayBaseline = useWidgetAbandonWatchdog(
    attemptStatus === "widget_open",
    () => finishAttempt("closed"),
  );

  const openWidget = useCallback(
    (params: PaymentParams, code: string | null, attemptId: number) => {
      const publicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY as
        | string
        | undefined;
      if (!publicKey) {
        finishAttempt("widget_unavailable");
        return;
      }
      setAttemptStatus("widget_open");
      captureOverlayBaseline();
      try {
        openWidgetModal(
          {
            currency: "COP",
            amountInCents: params.amountInCents,
            reference: params.reference,
            publicKey,
            signature: { integrity: params.signature },
          },
          (widgetResult) =>
            handleWidgetResult(widgetResult, params, code, attemptId),
        );
      } catch {
        finishAttempt("widget_unavailable");
      }
    },
    [openWidgetModal, handleWidgetResult, finishAttempt, captureOverlayBaseline],
  );

  const handleQuoteFailure = useCallback(
    (error: unknown, requestedCode: string | null) => {
      const wasCodeRejected =
        error instanceof CheckoutQuoteError &&
        error.kind === "rejected" &&
        requestedCode !== null &&
        latestRef.current.appliedCode === requestedCode;
      if (wasCodeRejected) {
        onCodeRejected(error);
        finishAttempt(null, false);
      } else {
        finishAttempt("quote_failed");
      }
    },
    [onCodeRejected, finishAttempt],
  );

  // A quote is only valid for what was on screen when it was requested. If the code or the total
  // moved meanwhile, the widget must not open: it's treated as a total change. Returns true when
  // the quote was rejected (and the attempt finished).
  const rejectStaleQuote = useCallback(
    (params: PaymentParams, requestedCode: string | null): boolean => {
      const shown = latestRef.current;
      const hasCodeChanged = shown.appliedCode !== requestedCode;
      const hasTotalChanged = params.amountInCents !== shown.displayedTotalInCents;
      if (!hasCodeChanged && !hasTotalChanged) return false;

      // A quote for another code says nothing about the total now shown: keep what is shown.
      const newTotalInCents = hasCodeChanged
        ? shown.displayedTotalInCents
        : params.amountInCents;
      if (!hasCodeChanged) onTotalMismatch(params.amountInCents, requestedCode);
      announce(
        `El total se actualizó a ${formatCop(newTotalInCents)}. Revisa el monto y vuelve a pagar`,
      );
      finishAttempt("total_changed");
      return true;
    },
    [onTotalMismatch, announce, finishAttempt],
  );

  const pay = useCallback(async () => {
    if (isBusyRef.current) return;
    if (widgetStatus === "error") {
      retryWidgetScript();
      return;
    }
    if (widgetStatus !== "ready") return;

    // Snapshot: this exact code is what the quote below is requested (and later checked) with.
    const requestedCode = appliedCode;
    isBusyRef.current = true;
    const attemptId = ++attemptIdRef.current;
    setOutcome(null);
    setAttemptStatus("opening");
    announce("Abriendo el formulario de pago");

    let params: PaymentParams;
    try {
      params = await requestPaymentParams({ plan, code: requestedCode, userId });
    } catch (error) {
      handleQuoteFailure(error, requestedCode);
      return;
    }

    if (rejectStaleQuote(params, requestedCode)) return;
    openWidget(params, requestedCode, attemptId);
  }, [
    widgetStatus,
    retryWidgetScript,
    plan,
    appliedCode,
    userId,
    announce,
    handleQuoteFailure,
    rejectStaleQuote,
    openWidget,
  ]);

  return {
    status: confirmation.isConfirming ? "confirming" : attemptStatus,
    outcome,
    result: confirmation.result,
    widgetStatus,
    payButtonRef,
    isBusyRef,
    pay,
    retryConfirmation: confirmation.retry,
  };
}
