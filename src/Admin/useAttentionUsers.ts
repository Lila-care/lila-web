import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { DashboardUserListItemDto, fetchAttentionUsers } from "@/api/users";

const DEFAULT_LIMIT = 5;

export function useAttentionUsers(limit: number = DEFAULT_LIMIT) {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardUserListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchAttentionUsers(token, limit)
      .then(setData)
      .catch(() => setError("No pudimos cargar las usuarias que requieren atención."))
      .finally(() => setLoading(false));
  }, [token, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
