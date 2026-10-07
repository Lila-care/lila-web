import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror ms-lila SubscriptionStatsDto exactly) ---

export interface SubscriptionStatsByPlan {
  planId: string;
  planName: string;
  count: number;
  // Only subscriptions with status 'active' (past_due / canceled fall back to the free plan).
  // Absent on BE versions that predate it.
  activeCount?: number;
}

export interface SubscriptionStats {
  totalSubscribers: number;
  byStatus: { active: number; past_due: number; canceled: number };
  byPlan: SubscriptionStatsByPlan[];
  mrrInCents: number;
}

export async function fetchSubscriptionStats(
  token: string,
  signal?: AbortSignal,
): Promise<SubscriptionStats> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/stats`, {
    headers: jsonAuthHeaders(token),
    signal,
  });
  return handleResponse<SubscriptionStats>(res);
}
