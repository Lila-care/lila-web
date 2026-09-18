import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// Mirrors the ms-lila PlanDto returned by GET /admin/subscription/plans.
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

export async function fetchAdminPlans(
  token: string,
  signal?: AbortSignal,
): Promise<PlanDto[]> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/plans`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<PlanDto[]>;
}
