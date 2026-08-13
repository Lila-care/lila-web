import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  DashboardUserDetailDto,
  DashboardUserListItemDto,
  fetchUserDetails,
  fetchUsers,
} from "@/api/users";

const DEFAULT_LIMIT = 20;

export function useUsers(limit: number = DEFAULT_LIMIT) {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DashboardUserListItemDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchUsers(token, page, limit)
      .then((res) => {
        setData(res.data);
        setTotalPages(res.totalPages);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error al cargar usuarias"),
      )
      .finally(() => setLoading(false));
  }, [token, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, page, setPage, totalPages, loading, error, refetch: load };
}

export function useUserDetail(userId: string | null) {
  const { token } = useAuth();
  const [user, setUser] = useState<DashboardUserDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userId) {
      setUser(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchUserDetails(token, userId)
      .then(setUser)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error al cargar la usuaria"),
      )
      .finally(() => setLoading(false));
  }, [token, userId]);

  return { user, loading, error };
}
