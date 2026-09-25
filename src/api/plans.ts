import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror the ms-lila PlanDto / create / patch contract exactly) ---

export type PlanStatus = "active" | "inactive";

export interface PlanDto {
  planId: string;
  name: string;
  amountInCents: number;
  currency: "COP";
  // null = no billing cycle (free plan).
  intervalDays: number | null;
  status: PlanStatus;
  description?: string;
  // null = unlimited daily interactions.
  maxInteractionsPerDay: number | null;
}

export interface CreatePlanPayload {
  name: string;
  amountInCents: number;
  currency: "COP";
  intervalDays?: number | null;
  description?: string;
  maxInteractionsPerDay?: number | null;
}

export interface UpdatePlanPayload {
  name?: string;
  amountInCents?: number;
  intervalDays?: number | null;
  status?: PlanStatus;
  description?: string;
  maxInteractionsPerDay?: number | null;
}

// --- API functions ---

export async function fetchPlans(
  token: string,
  signal?: AbortSignal,
): Promise<PlanDto[]> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/plans`, {
    headers: jsonAuthHeaders(token),
    signal,
  });
  return handleResponse<PlanDto[]>(res);
}

export async function createPlan(
  token: string,
  payload: CreatePlanPayload,
): Promise<PlanDto> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/plans`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<PlanDto>(res);
}

export async function updatePlan(
  token: string,
  planId: string,
  payload: UpdatePlanPayload,
): Promise<PlanDto> {
  const res = await authFetch(
    `${BASE_URL}/admin/subscription/plans/${planId}`,
    {
      method: "PATCH",
      headers: jsonAuthHeaders(token),
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<PlanDto>(res);
}
