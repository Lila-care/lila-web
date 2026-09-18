import { useCallback, useRef, useState } from "react";
import { CheckoutQuoteError, fetchCheckoutQuote } from "@/api/checkout";
import { formatCop } from "./formatCop";
import type { AppliedDiscount, CodeFieldStatus } from "./types";

// Same pattern the BE enforces; checking it here avoids a round trip (and a 400 that the
// contract reserves for "plan not found") for a code that can't possibly exist.
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

function normalizeCode(rawCode: string): string {
  return rawCode.trim().toUpperCase();
}

function statusFromError(error: unknown): CodeFieldStatus {
  if (error instanceof CheckoutQuoteError && error.kind === "rejected") {
    if (error.reason === "DISCOUNT_EXPIRED") return "expired";
    if (error.reason === "AMOUNT_BELOW_MINIMUM") return "below_minimum";
    return "invalid";
  }
  // invalid_plan / unauthorized / not_deployed / unavailable: we couldn't validate the code.
  return "unavailable";
}

// The code was refused (or couldn't be checked). It stays in the field with its error, but it is
// NOT pending: "Pagar" simply charges without it.
const REJECTED_STATUSES: CodeFieldStatus[] = [
  "invalid",
  "expired",
  "below_minimum",
  "unavailable",
];

const RETRYABLE_STATUSES: CodeFieldStatus[] = [...REJECTED_STATUSES, "unsaved"];

interface UseDiscountCodeArgs {
  planId: string;
  // Total shown when no code is applied (list price or static promo).
  baseTotalInCents: number;
  // Static promo total, or null. Only used to warn (in the announcement) when a code is worse.
  promoAmountInCents: number | null;
  announce: (message: string) => void;
}

// Owns the code field: text, validation status and the applied discount. "Aplicar" validates
// through `checkout-quote`; the quote itself is discarded (see AppliedDiscount).
export function useDiscountCode({
  planId,
  baseTotalInCents,
  promoAmountInCents,
  announce,
}: UseDiscountCodeArgs) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<CodeFieldStatus>("idle");
  const [applied, setApplied] = useState<AppliedDiscount | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  // Each validation creates a server-side quote: a double Enter/click must not fire two.
  const isValidatingRef = useRef(false);

  const focusInput = useCallback((shouldSelect: boolean) => {
    inputRef.current?.focus();
    if (shouldSelect) inputRef.current?.select();
  }, []);

  const rejectField = useCallback(
    (nextStatus: CodeFieldStatus) => {
      setStatus(nextStatus);
      focusInput(true);
    },
    [focusInput],
  );

  const changeInput = useCallback((nextInput: string) => {
    setInput(nextInput);
    // Editing after a rejection clears the stale error message.
    setStatus((current) =>
      RETRYABLE_STATUSES.includes(current) ? "idle" : current,
    );
  }, []);

  const apply = useCallback(async () => {
    const code = normalizeCode(input);
    if (!code || isValidatingRef.current || status === "valid") return;
    if (!CODE_PATTERN.test(code)) {
      rejectField("invalid");
      return;
    }

    isValidatingRef.current = true;
    setStatus("validating");
    announce("Validando código");
    try {
      const quote = await fetchCheckoutQuote({ planId, code });
      setInput(code);
      setApplied({
        code,
        discountInCents: quote.discountInCents,
        amountInCents: quote.amountInCents,
      });
      setStatus("valid");
      const isWorseThanPromo =
        promoAmountInCents !== null && quote.amountInCents > promoAmountInCents;
      announce(
        `Código ${code} aplicado. Nuevo total: ${formatCop(quote.amountInCents)}.` +
          (isWorseThanPromo
            ? ` Sin el código la promoción te deja en ${formatCop(promoAmountInCents)}.`
            : ""),
      );
      actionButtonRef.current?.focus();
    } catch (error) {
      rejectField(statusFromError(error));
    } finally {
      isValidatingRef.current = false;
    }
  }, [input, status, planId, promoAmountInCents, announce, rejectField]);

  const remove = useCallback(() => {
    setApplied(null);
    setInput("");
    setStatus("idle");
    announce(`Total actualizado a ${formatCop(baseTotalInCents)}`);
    focusInput(false);
  }, [announce, baseTotalInCents, focusInput]);

  // The fresh quote requested by "Pagar" refused a code that had validated earlier (e.g. it
  // expired in between): drop it so the displayed total matches what she would be charged.
  const dropRejectedCode = useCallback(
    (error: CheckoutQuoteError) => {
      setApplied(null);
      announce(`Total actualizado a ${formatCop(baseTotalInCents)}`);
      rejectField(statusFromError(error));
    },
    [announce, baseTotalInCents, rejectField],
  );

  const flagUnapplied = useCallback(() => {
    setStatus("unsaved");
    focusInput(false);
  }, [focusInput]);

  const isRejected = REJECTED_STATUSES.includes(status);
  // Text that was never applied nor refused: charging now would silently ignore what she typed.
  const hasUnappliedText =
    normalizeCode(input) !== "" && status !== "valid" && !isRejected;

  return {
    input,
    status,
    applied,
    hasUnappliedText,
    isRejected,
    inputRef,
    actionButtonRef,
    changeInput,
    apply,
    remove,
    dropRejectedCode,
    flagUnapplied,
  };
}
