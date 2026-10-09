import type { SortOrder, UserStage, UsersSortKey } from "@/api/users";
import { USER_STAGES } from "@/Admin/usersFormat";
import { toBogotaDateInputValue } from "@/Admin/bogotaDate";

// Filters of the Usuarias list live in the URL (?stage=&from=&to=&search=&sort=&order=&page=)
// so dashboard links (funnel, KPIs) and shared links open the same filtered list.

export interface UsersFilters {
  search: string;
  stage: UserStage | "";
  from: string;
  to: string;
  // KPI "Usuarias activas": from/to apply to lastActivityAt instead of createdAt.
  activeInRange: boolean;
  sort: UsersSortKey;
  order: SortOrder;
  page: number;
}

export const DEFAULT_SORT: UsersSortKey = "createdAt";
export const DEFAULT_ORDER: SortOrder = "desc";

export const DEFAULT_FILTERS: UsersFilters = {
  search: "",
  stage: "",
  from: "",
  to: "",
  activeInRange: false,
  sort: DEFAULT_SORT,
  order: DEFAULT_ORDER,
  page: 1,
};

const SORT_KEYS: UsersSortKey[] = [
  "createdAt",
  "email",
  "lastActivityAt",
  "conversations",
  "cycleReports",
  "stage",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string | null): string {
  return value && DATE_PATTERN.test(value) ? value : "";
}

export function parseUsersFilters(params: URLSearchParams): UsersFilters {
  const stage = params.get("stage");
  const sort = params.get("sort");
  const page = Number(params.get("page"));
  return {
    search: params.get("search")?.trim() ?? "",
    stage: USER_STAGES.includes(stage as UserStage) ? (stage as UserStage) : "",
    from: parseDate(params.get("from")),
    to: parseDate(params.get("to")),
    activeInRange: params.get("activeInRange") === "true",
    sort: SORT_KEYS.includes(sort as UsersSortKey)
      ? (sort as UsersSortKey)
      : DEFAULT_SORT,
    order: params.get("order") === "asc" ? "asc" : DEFAULT_ORDER,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

// Only non-default values are written, so the clean list stays at a clean `/admin/users`.
export function filtersToParams(filters: UsersFilters): Record<string, string> {
  const entries: Record<string, string> = {};
  if (filters.search) entries.search = filters.search;
  if (filters.stage) entries.stage = filters.stage;
  if (filters.from) entries.from = filters.from;
  if (filters.to) entries.to = filters.to;
  if (filters.activeInRange) entries.activeInRange = "true";
  if (filters.sort !== DEFAULT_SORT) entries.sort = filters.sort;
  if (filters.order !== DEFAULT_ORDER) entries.order = filters.order;
  if (filters.page > 1) entries.page = String(filters.page);
  return entries;
}

// What "Limpiar" resets: everything that narrows the list (not the sort).
export function hasActiveFilters(filters: UsersFilters): boolean {
  return !!(filters.search || filters.stage || filters.from || filters.to);
}

export function buildUsersHref(partial: Partial<UsersFilters>): string {
  const query = new URLSearchParams(
    filtersToParams({ ...DEFAULT_FILTERS, ...partial }),
  ).toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

// --- Registration-date range presets (Bogotá days) ---

export const RANGE_PRESET_DAYS = [7, 30, 90] as const;

function bogotaDaysAgo(days: number): string {
  return toBogotaDateInputValue(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
  );
}

// A preset covers the last N Bogotá calendar days including today.
export function presetRange(days: number): { from: string; to: string } {
  return { from: bogotaDaysAgo(days - 1), to: bogotaDaysAgo(0) };
}

export function matchPreset(from: string, to: string): number | null {
  return (
    RANGE_PRESET_DAYS.find((days) => {
      const range = presetRange(days);
      return range.from === from && range.to === to;
    }) ?? null
  );
}
