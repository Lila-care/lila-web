import { authFetch } from "@/api/authFetch";
import { handleResponse, jsonAuthHeaders } from "@/api/http";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror BE contract exactly — GET /admin/dashboard/users[/recent|/attention|/:userId]) ---

export type AccountStatus =
  "unconfirmed" | "confirmed" | "force_change_password";

export type AuthProvider = "google" | "password";

export type UserStage =
  | "unconfirmed"
  | "no_onboarding"
  | "onboarding_in_progress"
  | "onboarding_completed"
  | "subscribed";

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "none";

export type AttentionReason =
  | "unconfirmed_email"
  | "onboarding_stalled"
  | "checkout_abandoned"
  | "past_due"
  | "inactive_24h";

export interface OnboardingProgressDto {
  currentQuestionIndex: number;
  totalQuestions: number;
  startedAt: string;
  updatedAt: string;
}

export interface DashboardUserListItemDto {
  userId: string;
  email: string | undefined;
  createdAt: string;
  accountStatus: AccountStatus;
  provider: AuthProvider;
  stage: UserStage;
  onboarding: OnboardingProgressDto | null;
  conversations: number;
  cycleReports: number;
  lastActivityAt: string | null;
  subscriptionStatus: SubscriptionStatus;
  checkoutAttempts: number;
  attentionReason: AttentionReason | null;
}

export interface PaginatedDashboardUsersDto {
  data: DashboardUserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TimelineMilestoneKey =
  | "registered"
  | "confirmed"
  | "onboarding_started"
  | "onboarding_question_reached"
  | "onboarding_completed"
  | "first_cycle_report"
  | "first_conversation"
  | "checkout_attempt"
  | "subscription";

export interface TimelineMilestoneDto {
  key: TimelineMilestoneKey;
  reachedAt: string | null;
  // "N/total" on onboarding_question_reached.
  detail?: string;
}

export interface UserSummaryDto {
  conversations: number;
  cycleReports: number;
  plan: { planId: string; name: string } | null;
  subscriptionStatus: SubscriptionStatus;
  lastPayment: { amountInCents: number; paidAt: string } | null;
}

export interface DashboardUserDetailDto extends DashboardUserListItemDto {
  preferredName?: string;
  tiers: string[];
  timeline: TimelineMilestoneDto[];
  stoppedAt: TimelineMilestoneKey | null;
  summary: UserSummaryDto;
}

export type UsersSortKey =
  | "createdAt"
  | "email"
  | "lastActivityAt"
  | "conversations"
  | "cycleReports"
  | "stage";

export type SortOrder = "asc" | "desc";

export interface UsersQuery {
  page: number;
  limit: number;
  search?: string;
  stage?: UserStage;
  // YYYY-MM-DD, Bogotá days, inclusive.
  from?: string;
  to?: string;
  // true → from/to filter lastActivityAt instead of createdAt.
  activeInRange?: boolean;
  sort?: UsersSortKey;
  order?: SortOrder;
}

// --- API functions ---

function toSearchParams(query: UsersQuery): URLSearchParams {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.search) params.set("search", query.search);
  if (query.stage) params.set("stage", query.stage);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.activeInRange) params.set("activeInRange", "true");
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  return params;
}

export async function fetchUsers(
  token: string,
  query: UsersQuery,
  signal?: AbortSignal,
): Promise<PaginatedDashboardUsersDto> {
  const res = await authFetch(
    `${BASE_URL}/admin/dashboard/users?${toSearchParams(query)}`,
    { headers: jsonAuthHeaders(token), signal },
  );
  return handleResponse<PaginatedDashboardUsersDto>(res);
}

export async function fetchUserDetails(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<DashboardUserDetailDto> {
  const res = await authFetch(
    `${BASE_URL}/admin/dashboard/users/${encodeURIComponent(userId)}`,
    { headers: jsonAuthHeaders(token), signal },
  );
  return handleResponse<DashboardUserDetailDto>(res);
}

export async function fetchRecentUsers(
  token: string,
  limit: number,
): Promise<DashboardUserListItemDto[]> {
  const res = await authFetch(
    `${BASE_URL}/admin/dashboard/users/recent?limit=${limit}`,
    { headers: jsonAuthHeaders(token) },
  );
  return handleResponse<DashboardUserListItemDto[]>(res);
}

export async function fetchAttentionUsers(
  token: string,
  limit: number,
): Promise<DashboardUserListItemDto[]> {
  const res = await authFetch(
    `${BASE_URL}/admin/dashboard/users/attention?limit=${limit}`,
    { headers: jsonAuthHeaders(token) },
  );
  return handleResponse<DashboardUserListItemDto[]>(res);
}
