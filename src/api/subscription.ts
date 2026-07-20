import { authFetch } from "@/api/authFetch";
import type { PlanDto } from "@/api/plans";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (exact shapes from ms-lila's subscription module contract) ---

export type SubscriptionStatus = "none" | "active" | "past_due" | "canceled";

export interface SubscriptionDto {
  userId: string;
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface PaymentDto {
  transactionId: string;
  userId: string;
  planId: string;
  amountInCents: number;
  currency: "COP";
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  type: "INITIAL" | "RENEWAL";
  createdAt: string;
}

export interface CheckoutPayload {
  paymentSourceId: string;
  planId: string;
}

export interface CheckoutResponse {
  subscription: SubscriptionDto;
  payment: PaymentDto;
}

export interface GetSubscriptionResponse {
  subscription: SubscriptionDto;
}

// --- Helpers ---

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- API functions ---

// Public endpoint (no auth) — returns only plans with `status: 'active'`, `[]` if none exist
// (never 404s). Used by `useActivePlan` to resolve the `planId` a regular (non-admin) chat
// user needs for checkout, without going through the admin-guarded `GET /admin/subscription/plans`.
export async function getActivePlans(): Promise<PlanDto[]> {
  const res = await fetch(`${BASE_URL}/subscription/plans`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<PlanDto[]>(res);
}

export async function getMySubscription(
  token: string,
): Promise<GetSubscriptionResponse> {
  const res = await authFetch(`${BASE_URL}/subscription/me`, {
    headers: authHeaders(token),
  });
  return handleResponse<GetSubscriptionResponse>(res);
}

export async function createCheckout(
  token: string,
  payload: CheckoutPayload,
): Promise<CheckoutResponse> {
  const res = await authFetch(`${BASE_URL}/subscription/checkout`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<CheckoutResponse>(res);
}

export async function cancelSubscription(
  token: string,
): Promise<GetSubscriptionResponse> {
  const res = await authFetch(`${BASE_URL}/subscription/cancel`, {
    method: "POST",
    headers: authHeaders(token),
  });
  return handleResponse<GetSubscriptionResponse>(res);
}
