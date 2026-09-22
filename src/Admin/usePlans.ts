import { useCallback, useEffect, useState } from "react";
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

export interface PlanRow extends PlanDto {
  promo: PlanPromo | null;
}

// Loads the plan catalog together with the promo each plan currently carries (an active
// `static` discount within its validity window — see resolvePlanPromo in plansFormat.ts),
// plus the create/update mutations. `saving`/`saveError` are kept separate from the list's
// own `loading`/`error` so a failed save doesn't hide the already-loaded table.
export function usePlans() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchPlans(token),
      fetchDiscounts(token, { status: "active" }),
    ])
      .then(([planList, activeDiscounts]) => {
        setPlans(planList);
        setRows(
          planList.map((plan) => ({
            ...plan,
            promo: resolvePlanPromo(plan, activeDiscounts),
          })),
        );
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error al cargar los planes"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const create = useCallback(
    async (payload: CreatePlanPayload): Promise<PlanDto | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const created = await createPlan(token, payload);
        await load();
        return created;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Error al crear el plan");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token, load],
  );

  const update = useCallback(
    async (
      planId: string,
      payload: UpdatePlanPayload,
    ): Promise<PlanDto | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const updated = await updatePlan(token, planId, payload);
        await load();
        return updated;
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al guardar el plan",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token, load],
  );

  return {
    plans,
    rows,
    loading,
    error,
    refetch: load,
    saving,
    saveError,
    clearSaveError,
    create,
    update,
  };
}
