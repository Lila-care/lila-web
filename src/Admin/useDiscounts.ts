import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  CreateDiscountPayload,
  DiscountDto,
  UpdateDiscountPayload,
  createDiscount,
  fetchDiscounts,
  updateDiscount,
} from "@/api/discounts";
import { toPlansErrorMessage } from "@/Admin/plansErrors";

const LOAD_ERROR = "Intentá de nuevo en unos segundos.";

// Loads the full discount list (no filters — the Descuentos tab has no filter UI per the
// contract) plus the create/update mutations. Same first-load vs `refreshing` split and
// stale-request guard as usePlans.
export function useDiscounts() {
  const { token } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
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
      const list = await fetchDiscounts(token);
      if (requestId !== requestIdRef.current) return;
      hasLoadedRef.current = true;
      setDiscounts(list);
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
      request: () => Promise<DiscountDto>,
      fallback: string,
    ): Promise<DiscountDto | null> => {
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
    async (payload: CreateDiscountPayload): Promise<DiscountDto | null> => {
      if (!token) return null;
      return runSave(
        () => createDiscount(token, payload),
        "No pudimos crear el descuento. Intentá de nuevo.",
      );
    },
    [token, runSave],
  );

  const update = useCallback(
    async (
      discountId: string,
      payload: UpdateDiscountPayload,
    ): Promise<DiscountDto | null> => {
      if (!token) return null;
      return runSave(
        () => updateDiscount(token, discountId, payload),
        "No pudimos guardar el descuento. Intentá de nuevo.",
      );
    },
    [token, runSave],
  );

  return {
    discounts,
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
