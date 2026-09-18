import { useCallback, useEffect, useState } from "react";
import { fetchPlans, type PlanDto } from "@/api/checkout";

export type PlanLoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "empty" }
  | { status: "ready"; plan: PlanDto };

// Without an explicit `?planId=`, only an unambiguous purchase is allowed: exactly one paid,
// active plan. Zero or several means we can't guess what she wants to buy.
function selectCheckoutPlan(
  plans: PlanDto[],
  requestedPlanId: string | null,
): PlanLoadState {
  const payable = plans.filter(
    (plan) => plan.status === "active" && plan.amountInCents > 0,
  );
  const selected = requestedPlanId
    ? payable.find((plan) => plan.planId === requestedPlanId)
    : payable.length === 1
      ? payable[0]
      : undefined;
  return selected ? { status: "ready", plan: selected } : { status: "empty" };
}

export function useCheckoutPlan(requestedPlanId: string | null) {
  const [state, setState] = useState<PlanLoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    fetchPlans(controller.signal)
      .then((plans) => setState(selectCheckoutPlan(plans, requestedPlanId)))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });

    return () => controller.abort();
  }, [requestedPlanId, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, retry };
}
