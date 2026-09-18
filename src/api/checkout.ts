import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror BE contract exactly — KAN-64 WIP, unmerged) ---
// Source: ms-lila `src/subscription/dto/{plan,checkout-quote,confirm-widget-payment}.dto.ts`
// on branch feature/KAN-64-discount-engine. This file is the ONLY boundary with that contract:
// if KAN-64 changes shape before merge, adjust it here and nowhere else.

export type PlanStatus = "active" | "inactive";

export interface PlanDto {
  planId: string;
  name: string;
  amountInCents: number;
  currency: "COP";
  // `null` — no billing cycle.
  intervalDays: number | null;
  status: PlanStatus;
  description?: string;
  maxInteractionsPerDay: number | null;
  // KAN-64 extension: currently-running static (automatic) discount. `amountInCents` stays the
  // list price. Optional because the deployed BE does not send them until KAN-64 ships.
  promoAmountInCents?: number | null;
  promoEndsAt?: string | null;
}

export interface CheckoutQuoteRequestDto {
  planId: string;
  // Trimmed + uppercased. BE pattern: ^[A-Za-z0-9_-]{3,32}$
  code?: string;
}

export interface CheckoutQuoteDto {
  planId: string;
  reference: string;
  currency: "COP";
  listAmountInCents: number;
  discountInCents: number;
  amountInCents: number;
  // Wompi integrity signature for (reference, amountInCents) — the widget must be opened with
  // exactly these values.
  signature: string;
  discount: {
    discountId: string;
    kind: string;
    // `null` for a static (automatic) discount.
    code: string | null;
  } | null;
}

export type DiscountRejectionReason =
  | "DISCOUNT_NOT_FOUND"
  | "DISCOUNT_EXPIRED"
  | "DISCOUNT_NOT_STARTED"
  | "DISCOUNT_INACTIVE"
  | "DISCOUNT_WRONG_PLAN"
  | "AMOUNT_BELOW_MINIMUM";

// 422 body of POST /subscription/checkout-quote
interface CheckoutQuoteRejectionDto {
  statusCode: 422;
  message: string;
  reason: DiscountRejectionReason;
}

export interface ConfirmWidgetPaymentRequestDto {
  transactionId: string;
  planId: string;
}

// --- Errors ---

export type CheckoutQuoteErrorKind =
  // 422 with a `reason`: the code (or amount) was refused.
  | "rejected"
  // 400: plan does not exist or is inactive.
  | "invalid_plan"
  | "unauthorized"
  // 404: KAN-64 is not deployed in this environment yet.
  | "not_deployed"
  // 5xx / network.
  | "unavailable";

export class CheckoutQuoteError extends Error {
  readonly kind: CheckoutQuoteErrorKind;
  readonly reason?: DiscountRejectionReason;

  constructor(
    kind: CheckoutQuoteErrorKind,
    message: string,
    reason?: DiscountRejectionReason,
  ) {
    super(message);
    this.name = "CheckoutQuoteError";
    this.kind = kind;
    this.reason = reason;
  }
}

export class ConfirmWidgetPaymentError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status} confirming widget payment`);
    this.name = "ConfirmWidgetPaymentError";
    this.status = status;
  }
}

// --- API functions ---

// Public endpoint — a plain fetch is enough (no session needed to see the plans).
export async function fetchPlans(signal?: AbortSignal): Promise<PlanDto[]> {
  const res = await fetch(`${BASE_URL}/subscription/plans`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading plans`);
  return res.json() as Promise<PlanDto[]>;
}

// Prices the purchase server-side (including any discount code) and returns the reference,
// amount and signature the Wompi widget must be opened with. Every call creates a server-side
// record and a unique `reference`: never reuse a quote across widget openings.
export async function fetchCheckoutQuote(
  request: CheckoutQuoteRequestDto,
): Promise<CheckoutQuoteDto> {
  let res: Response;
  try {
    res = await authFetch(`${BASE_URL}/subscription/checkout-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new CheckoutQuoteError("unavailable", "Network error");
  }

  if (res.ok) return res.json() as Promise<CheckoutQuoteDto>;

  if (res.status === 422) {
    const body = (await res
      .json()
      .catch(() => null)) as CheckoutQuoteRejectionDto | null;
    throw new CheckoutQuoteError(
      "rejected",
      body?.message ?? "Discount rejected",
      body?.reason,
    );
  }
  if (res.status === 400) {
    throw new CheckoutQuoteError("invalid_plan", "Plan not found or inactive");
  }
  if (res.status === 401) {
    throw new CheckoutQuoteError("unauthorized", "Session required");
  }
  if (res.status === 404) {
    throw new CheckoutQuoteError("not_deployed", "checkout-quote not found");
  }
  throw new CheckoutQuoteError("unavailable", `HTTP ${res.status}`);
}

// Called after Wompi reports APPROVED. Sends ONLY {transactionId, planId}: the BE runs
// `forbidNonWhitelisted`, so an extra field would be rejected with 400 AFTER Wompi already
// charged the user. The discount is verified BE-side against the quote by `reference`.
export async function confirmWidgetPayment(
  request: ConfirmWidgetPaymentRequestDto,
): Promise<void> {
  const res = await authFetch(
    `${BASE_URL}/subscription/confirm-widget-payment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) throw new ConfirmWidgetPaymentError(res.status);
}

// TODO(KAN-64): remove legacy fallback once checkout-quote is deployed
// Deprecated BE route: it signs whatever amount the caller sends. Only used to keep the
// no-code purchase flow alive while `checkout-quote` (404) is not deployed.
export async function fetchLegacyCheckoutSignature(
  reference: string,
  amountInCents: number,
): Promise<string> {
  const query = new URLSearchParams({
    reference,
    amountInCents: String(amountInCents),
  });
  const res = await fetch(
    `${BASE_URL}/subscription/checkout-signature?${query.toString()}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} loading signature`);
  const body = (await res.json()) as { signature: string };
  return body.signature;
}
