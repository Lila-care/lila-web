import { useCallback, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  reportPeriodStart,
  PeriodStartSource,
  type PeriodSummary,
} from "@/api/cycleTracking";
import { usePeriodSummary } from "@/hooks/usePeriodSummary";

interface CycleFormValues {
  lastPeriodStart: string;
  cycleLength: number;
  periodLength: number;
}

interface UseProfileReturn {
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
export function useProfile(): UseProfileReturn {
  const { token } = useAuth();
  const { summary: fetchedSummary, loading, error } = usePeriodSummary();
  // reportPeriodStart ya devuelve el PeriodSummary actualizado — lo guardamos aparte en vez de
  // forzar un refetch, y lo priorizamos sobre el valor fetcheado por el hook compartido mientras
  // no haya un remount (usePeriodSummary solo hace fetch on mount / cambio de token).
  const [savedSummary, setSavedSummary] = useState<PeriodSummary | null>(null);
  const summary = savedSummary ?? fetchedSummary;
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
        setSavedSummary(updated);
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

  return {
    summary,
    loading,
    error,
    saving,
    saveError,
    saveSuccess,
    saveCycleInfo,
  };
}
