import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror the ms-lila DiscountDto / create / patch contract exactly) ---

export type DiscountKind = "static" | "custom";
export type DiscountValueType = "fixed" | "percentage";
export type DiscountStatus = "active" | "inactive";

export interface DiscountDto {
  discountId: string;
  planId: string;
  kind: DiscountKind;
  // Custom: the code the admin chose (UPPERCASE). Static: a generated `AUTO-<hex>` that
  // must never be rendered — see describeDiscount() in discountFormat.ts.
  code: string;
  valueType: DiscountValueType;
  // fixed = cents to subtract; percentage = integer 1–99.
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

// --- Errors ---

// Carries the HTTP status so the form can tell a 409 (duplicate code / overlapping static
// discount) from a 400 (validation) without parsing message text.
export class DiscountApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(" · ") || `HTTP ${status}`);
    this.name = "DiscountApiError";
    this.status = status;
    this.messages = messages;
  }
}

// NestJS error bodies are `{ statusCode, message: string | string[], error }`; class-validator
// failures arrive as an array.
async function readErrorMessages(res: Response): Promise<string[]> {
  const body: unknown = await res.json().catch(() => null);
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.map(String);
    if (typeof message === "string") return [message];
  }
  return [];
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new DiscountApiError(res.status, await readErrorMessages(res));
  }
  return res.json() as Promise<T>;
}

function jsonHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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
    { headers: jsonHeaders(token), signal },
  );
  return handleResponse<DiscountDto[]>(res);
}

export async function createDiscount(
  token: string,
  payload: CreateDiscountPayload,
): Promise<DiscountDto> {
  const res = await authFetch(`${BASE_URL}/admin/subscription/discounts`, {
    method: "POST",
    headers: jsonHeaders(token),
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
      headers: jsonHeaders(token),
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DiscountDto>(res);
}
