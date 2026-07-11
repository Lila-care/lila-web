import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { listForms, LilaForm } from "@/api/forms";

export function useForms() {
  const { token } = useAuth();
  const [forms, setForms] = useState<LilaForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    listForms(token)
      .then(setForms)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error al cargar los forms"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { forms, loading, error, refetch };
}
