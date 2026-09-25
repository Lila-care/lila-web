import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror the ms-lila DiscountDto / create / patch contract exactly) ---

export type DiscountKind = "static" | "custom";
export type DiscountValueType = "fixed" | "percentage";
export type DiscountStatus = "active" | "inactive";

export interface DiscountDto {
  discountId: string;
  planId: string;
  kind: DiscountKind;
  // Custom: the code the admin chose. Static: a generated `AUTO-xxxx` id that must never be
  // rendered to an admin — see formatDiscountCode() in plansFormat.ts.
  code: string;
  valueType: DiscountValueType;
  // fixed = cents to subtract; percentage = integer 1-99.
  value: number;
  startsAt: string;
  endsAt: string;
  status: DiscountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountPayload {
  planId: string;
  kind: DiscountKind;
  // Required by the BE when kind === "custom"; omitted for static.
  code?: string;
  valueType: DiscountValueType;
  value: number;
  startsAt: string;
  endsAt: string;
}

export interface UpdateDiscountPayload {
  value?: number;
  valueType?: DiscountValueType;
  startsAt?: string;
  endsAt?: string;
  status?: DiscountStatus;
}

export interface DiscountFilters {
  planId?: string;
  status?: DiscountStatus;
}

// --- API functions ---

export async function fetchDiscounts(
  token: string,
  filters: DiscountFilters = {},
  signal?: AbortSignal,
): Promise<DiscountDto[]> {
  const params = new URLSearchParams();
  if (filters.planId) params.set("planId", filters.planId);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  const res = await authFetch(
    `${BASE_URL}/admin/subscription/discounts${query ? `?${query}` : ""}`,
    { headers: jsonAuthHeaders(token), signal },
  );
  return handleResponse<DiscountDto[]>(res);
}

export async function createDiscount(
  token: string,
  payload: CreateDiscountPayload,
): Promise<DiscountDto> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/discounts`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<DiscountDto>(res);
}

export async function updateDiscount(
  token: string,
  discountId: string,
  payload: UpdateDiscountPayload,
): Promise<DiscountDto> {
  const res = await authFetch(
    `${BASE_URL}/admin/subscription/discounts/${discountId}`,
    {
      method: "PATCH",
      headers: jsonAuthHeaders(token),
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DiscountDto>(res);
}
