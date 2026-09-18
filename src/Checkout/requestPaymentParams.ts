import {
  CheckoutQuoteError,
  fetchCheckoutQuote,
  fetchLegacyCheckoutSignature,
  type PlanDto,
} from "@/api/checkout";

export interface PaymentParams {
  amountInCents: number;
  reference: string;
  signature: string;
}

interface RequestPaymentParamsArgs {
  plan: PlanDto;
  // Already-applied code, or null for a purchase without one.
  code: string | null;
  userId: string | null;
}

// TODO(KAN-64): remove legacy fallback once checkout-quote is deployed
async function requestLegacyParams(
  plan: PlanDto,
  userId: string | null,
): Promise<PaymentParams> {
  const reference = `sub-widget-${userId ?? "anonymous"}-${Date.now()}`;
  const signature = await fetchLegacyCheckoutSignature(
    reference,
    plan.amountInCents,
  );
  return { amountInCents: plan.amountInCents, reference, signature };
}

// Always asks the BE for a FRESH quote: each one carries a unique `reference` and a
// server-side record, so a quote is never reused between widget openings.
export async function requestPaymentParams({
  plan,
  code,
  userId,
}: RequestPaymentParamsArgs): Promise<PaymentParams> {
  try {
    const quote = await fetchCheckoutQuote({
      planId: plan.planId,
      ...(code ? { code } : {}),
    });
    return {
      amountInCents: quote.amountInCents,
      reference: quote.reference,
      signature: quote.signature,
    };
  } catch (error) {
    // TODO(KAN-64): remove legacy fallback once checkout-quote is deployed
    const isEndpointMissing =
      error instanceof CheckoutQuoteError && error.kind === "not_deployed";
    if (isEndpointMissing && !code) return requestLegacyParams(plan, userId);
    throw error;
  }
}
