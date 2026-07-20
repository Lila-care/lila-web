import { authFetch } from "@/api/authFetch";
import type { SubscriptionStatus } from "@/api/subscription";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types ---

export interface SubscriptionStatsDto {
  totalSubscribers: number;
  byStatus: { active: number; past_due: number; canceled: number };
  byPlan: { planId: string; planName: string; count: number }[];
  mrrInCents: number;
}

export interface SubscriberListItem {
  userId: string;
  email?: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

export interface SubscribersPage {
  items: SubscriberListItem[];
  nextCursor: string | null;
}

export interface ListSubscribersParams {
  status?: SubscriptionStatus;
  planId?: string;
  cursor?: string;
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

export async function getSubscriptionStats(
  token: string,
): Promise<SubscriptionStatsDto> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/stats`, {
    headers: authHeaders(token),
  });
  return handleResponse<SubscriptionStatsDto>(res);
}

export async function listSubscribers(
  token: string,
  params: ListSubscribersParams = {},
): Promise<SubscribersPage> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.planId) query.set("planId", params.planId);
  if (params.cursor) query.set("cursor", params.cursor);
  const qs = query.toString();
  const res = await authFetch(
    `${BASE_URL}/admin/subscription/subscribers${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(token) },
  );
  return handleResponse<SubscribersPage>(res);
}
