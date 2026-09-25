import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { listPhaseBanners, type PhaseBanner } from "@/api/learn";
import { learnErrorMessage } from "@/Admin/contentLabels";

export function usePhaseBanners() {
  const { token } = useAuth();
  const [banners, setBanners] = useState<PhaseBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    listPhaseBanners(token)
      .then(setBanners)
      .catch((caught) => setError(learnErrorMessage(caught)))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Upserts one banner with the entity a mutation returned (the first save creates it).
  const replaceBanner = useCallback((updated: PhaseBanner) => {
    setBanners((current) => [
      ...current.filter((banner) => banner.phase !== updated.phase),
      updated,
    ]);
  }, []);

  return { banners, loading, error, refetch, replaceBanner };
}
