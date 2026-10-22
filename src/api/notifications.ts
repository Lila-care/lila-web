import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror the ms-lila POST /admin/notifications/broadcast contract exactly) ---

export const NOTIFICATION_CATEGORIES = [
  "cycle",
  "periodPredictions",
  "dailyReminder",
  "news",
  "plan",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const TITLE_MAX_LENGTH = 35;
export const BODY_MAX_LENGTH = 100;
export const ALLOWLIST_MAX_USERS = 200;

export interface BroadcastPayload {
  title?: string;
  body: string;
  category: NotificationCategory;
  // BE default is true; the UI always sends it explicitly.
  dryRun: boolean;
  // Cognito `sub`s. 1..200, and mandatory for a real send (the BE answers 400 without it).
  allowlistUserIds?: string[];
  // 0..23; only users whose local hour matches receive it.
  localHour?: number;
}

export interface BroadcastResult {
  dryRun: boolean;
  recipients: { users: number; devices: number };
  skipped: {
    categoryOff: number;
    quietHours: number;
    notLocalHour: number;
    total: number;
  };
  sent: number;
  failed: number;
  removed: number;
  aborted: boolean;
}

// --- API functions ---

export async function sendBroadcast(
  token: string,
  payload: BroadcastPayload,
  signal?: AbortSignal,
): Promise<BroadcastResult> {
  const res = await authFetch(`${BASE_URL}/admin/notifications/broadcast`, {
    method: "POST",
    headers: jsonAuthHeaders(token),
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse<BroadcastResult>(res);
}
