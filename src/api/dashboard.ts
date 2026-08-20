import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror BE contract exactly — GET /admin/dashboard/stats) ---

export interface DailyCount {
  date: string;
  count: number;
}

export interface DashboardStatsDto {
  range: { days: number; from: string; to: string };
  newUsers: { total: number; byDay: DailyCount[] };
  activeUsers: { total: number };
  cycleReports: { total: number; byDay: DailyCount[] };
  conversations: { total: number; byDay: DailyCount[] };
  retention: { newUsersInRange: number; returned: number; rate: number };
}

export type DashboardRangeDays = 7 | 30 | 90;

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

export async function getDashboardStats(
  token: string,
  days: DashboardRangeDays,
  signal?: AbortSignal,
): Promise<DashboardStatsDto> {
  const res = await authFetch(
    `${BASE_URL}/admin/dashboard/stats?days=${days}`,
    { headers: authHeaders(token), signal },
  );
  return handleResponse<DashboardStatsDto>(res);
}
