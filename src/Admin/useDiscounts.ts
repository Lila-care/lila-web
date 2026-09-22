import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  CreateDiscountPayload,
  DiscountDto,
  UpdateDiscountPayload,
  createDiscount,
  fetchDiscounts,
  updateDiscount,
} from "@/api/discounts";

// Loads the full discount list (no filters — the Descuentos tab has no filter UI per the
// contract) plus the create/update mutations, mirroring the saving/saveError split used by
// usePlans/useFormEditor.
export function useDiscounts() {
  const { token } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetchDiscounts(token)
      .then(setDiscounts)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Error al cargar los descuentos",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  const create = useCallback(
    async (payload: CreateDiscountPayload): Promise<DiscountDto | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const created = await createDiscount(token, payload);
        await load();
        return created;
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al crear el descuento",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token, load],
  );

  const update = useCallback(
    async (
      discountId: string,
      payload: UpdateDiscountPayload,
    ): Promise<DiscountDto | null> => {
      if (!token) return null;
      setSaving(true);
      setSaveError(null);
      try {
        const updated = await updateDiscount(token, discountId, payload);
        await load();
        return updated;
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Error al guardar el descuento",
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [token, load],
  );

  return {
    discounts,
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
