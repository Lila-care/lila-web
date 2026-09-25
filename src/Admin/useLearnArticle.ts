import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getArticle, type LearnArticle } from "@/api/learn";
import { learnErrorMessage } from "@/Admin/contentLabels";

export function useLearnArticle(articleId: string) {
  const { token } = useAuth();
  const [article, setArticle] = useState<LearnArticle | null>(null);
  // Bumps on every entity received, so the editor can reset its draft even when a reload
  // returns an identical article.
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const replaceArticle = useCallback((next: LearnArticle) => {
    setArticle(next);
    setRevision((current) => current + 1);
  }, []);

  const reload = useCallback(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getArticle(token, articleId)
      .then((result) => {
        if (!cancelled) replaceArticle(result);
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
  }, [token, articleId, replaceArticle]);

  useEffect(() => reload(), [reload]);

  // Mutations return the updated article — store it directly instead of refetching.
  return { article, revision, loading, error, reload, replaceArticle };
}
