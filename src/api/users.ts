import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror BE contract exactly — GET /admin/dashboard/users[/:userId]) ---

export interface DashboardUserListItemDto {
  userId: string;
  email: string | undefined;
  cycleReports: number;
  conversations: number;
  lastActivityAt: string | null;
}

export interface PaginatedDashboardUsersDto {
  data: DashboardUserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardUserDetailDto {
  userId: string;
  email: string | undefined;
  tiers: string[];
  preferredName?: string;
  cycleReports: number;
  conversations: number;
  lastActivityAt: string | null;
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

export async function fetchUsers(
  token: string,
  page: number,
  limit: number,
): Promise<PaginatedDashboardUsersDto> {
  const res = await authFetch(
    `${BASE_URL}/admin/dashboard/users?page=${page}&limit=${limit}`,
    { headers: authHeaders(token) },
  );
  return handleResponse<PaginatedDashboardUsersDto>(res);
}

export async function fetchUserDetails(
  token: string,
  userId: string,
): Promise<DashboardUserDetailDto> {
  const res = await authFetch(`${BASE_URL}/admin/dashboard/users/${userId}`, {
    headers: authHeaders(token),
  });
  return handleResponse<DashboardUserDetailDto>(res);
}
