import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/http";
import {
  DashboardUserDetailDto,
  DashboardUserListItemDto,
  fetchUserDetails,
  fetchUsers,
} from "@/api/users";
import type { UsersFilters } from "@/Admin/usersFilters";

export const USERS_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// Typing in the search box updates the URL on every keystroke; the request waits until the
// admin pauses (each list call scans full tables in ms-lila).
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useUsers(filters: UsersFilters) {
  const { token } = useAuth();
  const search = useDebounced(filters.search, SEARCH_DEBOUNCE_MS);
  const { stage, from, to, activeInRange, sort, order, page } = filters;
  const [data, setData] = useState<DashboardUserListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchUsers(
      token,
      {
        page,
        limit: USERS_PAGE_SIZE,
        search: search || undefined,
        stage: stage || undefined,
        from: from || undefined,
        to: to || undefined,
        activeInRange,
        sort,
        order,
      },
      controller.signal,
    )
      .then((res) => {
        setData(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((e) => {
        if (isAbort(e)) return;
        setError("No pudimos cargar las usuarias.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    // A newer filter selection aborts the previous request, so a stale response can never
    // overwrite a fresher one.
    return () => controller.abort();
  }, [token, search, stage, from, to, activeInRange, sort, order, page, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { data, total, totalPages, loading, error, refetch };
}

export function useUserDetail(userId: string | null) {
  const { token } = useAuth();
  const [user, setUser] = useState<DashboardUserDetailDto | null>(null);
  // Starts true when there is something to fetch, so the first paint is the skeleton and
  // never an empty panel.
  const [loading, setLoading] = useState(Boolean(token && userId));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setUser(null);
    setNotFound(false);
    setError(null);
    if (!token || !userId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchUserDetails(token, userId, controller.signal)
      .then(setUser)
      .catch((e) => {
        if (isAbort(e)) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError("No pudimos cargar la usuaria.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, userId, reloadToken]);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { user, loading, error, notFound, refetch };
}
