import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  createDiscount,
  fetchDiscounts,
  updateDiscount,
  type CreateDiscountPayload,
  type DiscountDto,
  type DiscountStatus,
  type UpdateDiscountPayload,
} from "@/api/discounts";
import { fetchAdminPlans, type PlanDto } from "@/api/plans";

// Radix Select items cannot have an empty-string value, so "all" stands for "no filter".
export const ALL_FILTER = "all";

export interface DiscountListFilters {
  plan: string;
  status: typeof ALL_FILTER | DiscountStatus;
}

const DEFAULT_FILTERS: DiscountListFilters = {
  plan: ALL_FILTER,
  status: ALL_FILTER,
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Error desconocido";
}

export function useDiscounts() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [discounts, setDiscounts] = useState<DiscountDto[] | null>(null);
  const [filters, setFilters] = useState<DiscountListFilters>(DEFAULT_FILTERS);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [discountsError, setDiscountsError] = useState<string | null>(null);
  const [isFetchingDiscounts, setIsFetchingDiscounts] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Plans rarely change and are needed for names, the plan filter and the form's plan picker.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setPlansError(null);
    fetchAdminPlans(token, controller.signal)
      .then(setPlans)
      .catch((e) => {
        if (!controller.signal.aborted) setPlansError(errorMessage(e));
      });
    return () => controller.abort();
  }, [token, reloadKey]);

  // Aborting the previous request when a filter changes means a slow, stale response can never
  // overwrite the results of a newer filter selection.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setIsFetchingDiscounts(true);
    setDiscountsError(null);
    fetchDiscounts(
      token,
      {
        planId: filters.plan === ALL_FILTER ? undefined : filters.plan,
        status: filters.status === ALL_FILTER ? undefined : filters.status,
      },
      controller.signal,
    )
      .then(setDiscounts)
      .catch((e) => {
        if (!controller.signal.aborted) setDiscountsError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFetchingDiscounts(false);
      });
    return () => controller.abort();
  }, [token, filters, reloadKey]);

  const sortedDiscounts = useMemo(
    () =>
      discounts
        ? [...discounts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : null,
    [discounts],
  );

  const error = plansError ?? discountsError;
  const hasLoaded = sortedDiscounts !== null && plans !== null;

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const requireToken = (): string => {
    if (!token) throw new Error("Sesión no disponible");
    return token;
  };

  const create = async (payload: CreateDiscountPayload) => {
    await createDiscount(requireToken(), payload);
    reload();
  };

  const update = async (discountId: string, payload: UpdateDiscountPayload) => {
    await updateDiscount(requireToken(), discountId, payload);
    reload();
  };

  return {
    plans: plans ?? [],
    discounts: sortedDiscounts ?? [],
    filters,
    setPlanFilter: (plan: string) => setFilters((f) => ({ ...f, plan })),
    setStatusFilter: (status: DiscountListFilters["status"]) =>
      setFilters((f) => ({ ...f, status })),
    clearFilters: () => setFilters(DEFAULT_FILTERS),
    hasActiveFilters:
      filters.plan !== ALL_FILTER || filters.status !== ALL_FILTER,
    isInitialLoading: !hasLoaded && !error,
    isRefetching: hasLoaded && isFetchingDiscounts,
    error,
    retry: reload,
    create,
    update,
  };
}
