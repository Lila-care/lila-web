import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror the ms-lila subscriber list contract exactly) ---

export type SubscriberStatus = "none" | "active" | "past_due" | "canceled";
export type SubscriberSource = "paid" | "admin_trial";

export interface SubscriberListItemDto {
  userId: string;
  email?: string;
  planName: string;
  status: SubscriberStatus;
  currentPeriodEnd: string | null;
  source: SubscriberSource;
}

export interface ListSubscribersResponse {
  items: SubscriberListItemDto[];
  nextCursor: string | null;
}

export interface SubscriberFilters {
  status?: SubscriberStatus;
  planId?: string;
}

// --- API functions ---

export async function fetchSubscribers(
  token: string,
  filters: SubscriberFilters = {},
  cursor?: string | null,
  signal?: AbortSignal,
): Promise<ListSubscribersResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.planId) params.set("planId", filters.planId);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  const res = await authFetch(
    `${BASE_URL}/admin/subscription/subscribers${query ? `?${query}` : ""}`,
    { headers: jsonAuthHeaders(token), signal },
  );
  return handleResponse<ListSubscribersResponse>(res);
}
