import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { DashboardUserListItemDto, fetchRecentUsers } from "@/api/users";

const DEFAULT_LIMIT = 10;

export function useRecentUsers(limit: number = DEFAULT_LIMIT) {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardUserListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchRecentUsers(token, limit)
      .then(setData)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Error al cargar usuarias recientes",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
