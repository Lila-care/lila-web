import { useCallback, useState } from "react";
import type { CheckoutQuoteError, PlanDto } from "@/api/checkout";
import { useAuth } from "@/auth/AuthContext";
import { useDiscountCode } from "./useDiscountCode";
import { usePayment } from "./usePayment";

// A fresh quote can disagree with what is displayed (e.g. a promo started). The quote wins, but
// only for the code it was requested with — applying/removing a code invalidates it.
interface TotalOverride {
  amountInCents: number;
  forCode: string | null;
}

// Composes the code field and the payment flow around the total the user is looking at.
export function useCheckout(
  plan: PlanDto,
  announce: (message: string) => void,
) {
  const { userId } = useAuth();
  const [totalOverride, setTotalOverride] = useState<TotalOverride | null>(
    null,
  );

  // Static (automatic) promo already applied by the BE; a custom code replaces it.
  const promoAmountInCents = plan.promoAmountInCents ?? null;
  const baseTotalInCents = promoAmountInCents ?? plan.amountInCents;
  const discount = useDiscountCode({
    planId: plan.planId,
    baseTotalInCents,
    promoAmountInCents,
    announce,
  });

  const appliedCode = discount.applied?.code ?? null;
  const totalInCents =
    totalOverride && totalOverride.forCode === appliedCode
      ? totalOverride.amountInCents
      : (discount.applied?.amountInCents ?? baseTotalInCents);

  const handleTotalMismatch = useCallback(
    (amountInCents: number, forCode: string | null) =>
      setTotalOverride({ amountInCents, forCode }),
    [],
  );

  // Removing / dropping a code leaves any total override obsolete: it must not resurface.
  const { remove: removeCode, dropRejectedCode } = discount;
  const handleDropRejectedCode = useCallback(
    (error: CheckoutQuoteError) => {
      setTotalOverride(null);
      dropRejectedCode(error);
    },
    [dropRejectedCode],
  );

  const payment = usePayment({
    plan,
    userId,
    appliedCode,
    displayedTotalInCents: totalInCents,
    onTotalMismatch: handleTotalMismatch,
    onCodeRejected: handleDropRejectedCode,
    announce,
  });

  // While a quote/payment is in flight the code must not change under it. Guarded by the ref
  // (synchronous) as well as by the UI lock, so a stray Enter/click can't slip through.
  const { isBusyRef, pay, status: payStatus } = payment;
  const { apply: applyCode } = discount;
  const apply = useCallback(async () => {
    if (isBusyRef.current) return;
    await applyCode();
  }, [isBusyRef, applyCode]);
  const remove = useCallback(() => {
    if (isBusyRef.current) return;
    setTotalOverride(null);
    removeCode();
  }, [isBusyRef, removeCode]);

  const { hasUnappliedText, flagUnapplied } = discount;
  // Typed-but-unapplied text would silently charge the full price: stop and point at the field.
  // (A code that was REFUSED is not "unapplied": it stays in the field and Pagar charges without it.)
  const handlePay = useCallback(() => {
    if (hasUnappliedText) {
      flagUnapplied();
      return;
    }
    void pay();
  }, [hasUnappliedText, flagUnapplied, pay]);

  // A custom code REPLACES the static promo, so it can leave her paying more than the promo.
  const isCodeWorseThanPromo =
    discount.applied !== null &&
    promoAmountInCents !== null &&
    discount.applied.amountInCents > promoAmountInCents;

  return {
    discount: { ...discount, apply, remove },
    payment,
    handlePay,
    isCodeLocked: payStatus !== "idle",
    // Pagar will charge the shown total WITHOUT the refused code that is still in the field.
    isPayingWithoutCode: discount.isRejected,
    promoOverride:
      isCodeWorseThanPromo && promoAmountInCents !== null
        ? {
            withCodeInCents: totalInCents,
            withoutCodeInCents: promoAmountInCents,
          }
        : null,
    totals: {
      listInCents: plan.amountInCents,
      discountInCents: Math.max(plan.amountInCents - totalInCents, 0),
      totalInCents,
    },
  };
}
