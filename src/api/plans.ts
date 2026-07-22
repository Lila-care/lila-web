import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types ---

export type PlanStatus = "active" | "inactive";

export interface PlanDto {
  planId: string;
  name: string;
  amountInCents: number;
  currency: "COP";
  intervalDays: number;
  status: PlanStatus;
  description?: string;
  // `null` = unlimited daily interactions.
  maxInteractionsPerDay: number | null;
}

export interface CreatePlanPayload {
  name: string;
  amountInCents: number;
  currency: "COP";
  intervalDays: number;
  description?: string;
  maxInteractionsPerDay?: number | null;
}

export interface UpdatePlanPayload {
  name?: string;
  amountInCents?: number;
  status?: PlanStatus;
  description?: string;
  maxInteractionsPerDay?: number | null;
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

export async function listPlans(token: string): Promise<PlanDto[]> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/plans`, {
    headers: authHeaders(token),
  });
  return handleResponse<PlanDto[]>(res);
}

export async function createPlan(
  token: string,
  payload: CreatePlanPayload,
): Promise<PlanDto> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/plans`, {
    method: "POST",
    headers: authHeaders(token),
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
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<PlanDto>(res);
}
