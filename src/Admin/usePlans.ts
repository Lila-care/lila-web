import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  CreatePlanPayload,
  PlanDto,
  UpdatePlanPayload,
  createPlan,
  fetchPlans,
  updatePlan,
} from "@/api/plans";
import { fetchDiscounts } from "@/api/discounts";
import { PlanPromo, resolvePlanPromo } from "@/Admin/plansFormat";
import { toPlansErrorMessage } from "@/Admin/plansErrors";

export interface PlanRow extends PlanDto {
  promo: PlanPromo | null;
}

const LOAD_ERROR = "Intentá de nuevo en unos segundos.";

// Loads the plan catalog together with the promo each plan currently carries (an active
// `static` discount within its validity window — see resolvePlanPromo in plansFormat.ts),
// plus the create/update mutations. `saving`/`saveError` are kept separate from the list's
// own `loading`/`error` so a failed save doesn't hide the already-loaded ledger.
//
// `loading` is only the first load: later refetches set `refreshing` and keep the current rows
// mounted, so the "Editar" button that opened a panel is still there to take focus back.
export function usePlans() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  // Only the latest request may write state — an older one resolving late is dropped.
  const requestIdRef = useRef(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) return;
    const requestId = ++requestIdRef.current;
    const setBusy = hasLoadedRef.current ? setRefreshing : setLoading;
    setBusy(true);
    setError(null);
    try {
      const [planList, activeDiscounts] = await Promise.all([
        fetchPlans(token),
        fetchDiscounts(token, { status: "active" }),
      ]);
      if (requestId !== requestIdRef.current) return;
      hasLoadedRef.current = true;
      setPlans(planList);
      setRows(
        planList.map((plan) => ({
          ...plan,
          promo: resolvePlanPromo(plan, activeDiscounts),
        })),
      );
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(toPlansErrorMessage(e, LOAD_ERROR));
    } finally {
      if (requestId === requestIdRef.current) setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const runSave = useCallback(
    async (
      request: () => Promise<PlanDto>,
      fallback: string,
    ): Promise<PlanDto | null> => {
      setSaving(true);
      setSaveError(null);
      try {
        const saved = await request();
        await load();
        return saved;
      } catch (e) {
        setSaveError(toPlansErrorMessage(e, fallback));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const create = useCallback(
    async (payload: CreatePlanPayload): Promise<PlanDto | null> => {
      if (!token) return null;
      return runSave(
        () => createPlan(token, payload),
        "No pudimos crear el plan. Intentá de nuevo.",
      );
    },
    [token, runSave],
  );

  const update = useCallback(
    async (
      planId: string,
      payload: UpdatePlanPayload,
    ): Promise<PlanDto | null> => {
      if (!token) return null;
      return runSave(
        () => updatePlan(token, planId, payload),
        "No pudimos guardar el plan. Intentá de nuevo.",
      );
    },
    [token, runSave],
  );

  return {
    plans,
    rows,
    loading,
    refreshing,
    error,
    refetch: load,
    saving,
    saveError,
    clearSaveError,
    create,
    update,
  };
}
