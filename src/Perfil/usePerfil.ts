import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  getPeriodSummary,
  reportPeriodStart,
  PeriodStartSource,
  type PeriodSummary,
} from "@/api/cycleTracking";

interface CycleFormValues {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
}

interface UsePerfilReturn {
  summary: PeriodSummary | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  saveCycleInfo: (values: CycleFormValues) => Promise<void>;
}

// El BE no expone editar solo un campo — /period/start siempre recibe duración de ciclo +
// última regla juntos en un único submit (regla del contrato técnico).
export function usePerfil(): UsePerfilReturn {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPeriodSummary(token)
      .then((res) => {
        if (!cancelled) setSummary(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar tu ciclo");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const saveCycleInfo = useCallback(
    async (values: CycleFormValues) => {
      if (!token || saving) return;
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      try {
        const updated = await reportPeriodStart(token, {
          reportedStartDate: values.lastPeriodStart,
          reportedAt: new Date().toISOString(),
          source: PeriodStartSource.USER,
          periodLength: values.periodLength,
          cycleLength: values.cycleLength,
        });
        setSummary(updated);
        setSaveSuccess(true);
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Error al guardar tu ciclo",
        );
      } finally {
        setSaving(false);
      }
    },
    [token, saving],
  );

  return { summary, loading, error, saving, saveError, saveSuccess, saveCycleInfo };
}
