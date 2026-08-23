import { useCallback, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  createPlan,
  CreatePlanPayload,
  PlanDto,
  updatePlan,
  UpdatePlanPayload,
} from "@/api/plans";

// Unlike `useFormEditor`, there's no `GET /admin/subscription/plans/:id` in the contract —
// only list/create/patch — so this hook only owns the two write actions with their own
// saving/error state. `PlansPage` passes the already-fetched `PlanDto` straight into the
// detail view instead of re-fetching by id.
export function usePlanEditor() {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const create = useCallback(
    async (payload: CreatePlanPayload): Promise<PlanDto | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        return await createPlan(token, payload);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Error al crear el plan");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
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
        return await updatePlan(token, planId, payload);
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al guardar el plan",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return { saving, saveError, create, update };
}
