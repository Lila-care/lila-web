import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  listArticles,
  type LearnArticle,
  type ReviewStatus,
} from "@/api/learn";
import { learnErrorMessage } from "@/Admin/contentLabels";

export function useLearnArticles(status: ReviewStatus | null) {
  const { token } = useAuth();
  const [articles, setArticles] = useState<LearnArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listArticles(token, status ?? undefined)
      .then((result) => {
        if (!cancelled) setArticles(result);
      })
      .catch((caught) => {
        if (!cancelled) setError(learnErrorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, status]);

  // The cleanup drops a stale response when the status filter changes mid-request.
  useEffect(() => refetch(), [refetch]);

  return { articles, loading, error, refetch };
}
