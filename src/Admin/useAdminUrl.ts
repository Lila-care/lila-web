import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import {
  DEFAULT_FILTERS,
  filtersToParams,
  parseUsersFilters,
  type UsersFilters,
} from "@/Admin/usersFilters";

// Both the user detail panel (`?user=<userId>`) and the Usuarias filters live in the query
// string of the CURRENT admin page, so the panel opens from the dashboard and from the list
// without a dedicated route, and closing it never loses the list's filters.

export const USER_PARAM = "user";

function toHref(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function useSelectedUser() {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const userId = params.get(USER_PARAM);

  const hrefFor = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set(USER_PARAM, id);
      return toHref(path, next);
    },
    [path, params],
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete(USER_PARAM);
    navigate(toHref(path, next), { replace: true });
  }, [path, params, navigate]);

  return { userId, hrefFor, close };
}

export function useUsersFilters() {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const filters = useMemo(() => parseUsersFilters(params), [params]);

  // Any change resets to page 1 unless the caller sets the page itself. `replace` keeps the
  // history clean: typing in the search box must not add one entry per keystroke.
  const setFilters = useCallback(
    (partial: Partial<UsersFilters>) => {
      const next = new URLSearchParams(
        filtersToParams({ ...filters, page: 1, ...partial }),
      );
      const user = params.get(USER_PARAM);
      if (user) next.set(USER_PARAM, user);
      navigate(toHref(path, next), { replace: true });
    },
    [filters, params, path, navigate],
  );

  const clearFilters = useCallback(
    () =>
      setFilters({
        search: DEFAULT_FILTERS.search,
        stage: DEFAULT_FILTERS.stage,
        from: DEFAULT_FILTERS.from,
        to: DEFAULT_FILTERS.to,
        activeInRange: false,
      }),
    [setFilters],
  );

  return { filters, setFilters, clearFilters };
}
