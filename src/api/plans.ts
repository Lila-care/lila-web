import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror the ms-lila PlanDto / create / patch contract exactly) ---

export type PlanStatus = "active" | "inactive" | "coming_soon";

// A resolved entitlement: flag = boolean; limit = integer quota, `null` = unlimited, `0` = blocked.
export type EntitlementValue = boolean | number | null;

export type EntitlementMap = Record<string, EntitlementValue>;

export type FeatureSection = "chat" | "learn" | "cycle";

export type FeatureType = "flag" | "limit";

export type FeatureUnit =
  | "per_day"
  | "per_month"
  | "days"
  | "cycles"
  | "profiles";

// One row of GET /admin/subscription/features. `enforced: false` = announced ("Próximamente"):
// the BE answers 400 if a value is sent for it.
export interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
  section: FeatureSection;
  type: FeatureType;
  unit?: FeatureUnit;
  default: boolean | number | null;
  enforced: boolean;
}

export interface PlanDto {
  planId: string;
  name: string;
  amountInCents: number;
  currency: "COP";
  // null = no billing cycle (free plan).
  intervalDays: number | null;
  status: PlanStatus;
  description?: string;
  features: string[];
  promoAmountInCents?: number | null;
  promoEndsAt?: string | null;
  // Complete map, defaults already resolved by the BE.
  entitlements: EntitlementMap;
  // Deprecated mirror of entitlements.daily_chat_messages (null = unlimited).
  maxInteractionsPerDay: number | null;
}

export interface CreatePlanPayload {
  name: string;
  amountInCents: number;
  currency: "COP";
  intervalDays?: number | null;
  description?: string;
  entitlements?: EntitlementMap;
}

export interface UpdatePlanPayload {
  name?: string;
  amountInCents?: number;
  intervalDays?: number | null;
  status?: PlanStatus;
  description?: string;
  // Partial merge by key: send only the keys that changed.
  entitlements?: EntitlementMap;
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

export async function fetchPlanFeatures(
  token: string,
  signal?: AbortSignal,
): Promise<FeatureDefinition[]> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/features`, {
    headers: jsonAuthHeaders(token),
    signal,
  });
  return handleResponse<FeatureDefinition[]>(res);
}
