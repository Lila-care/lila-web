import { useEffect, useState } from "react";
import CheckoutLayout, { PageTitle } from "./CheckoutLayout";
import CheckoutReady from "./CheckoutReady";
import {
  CheckoutSkeleton,
  PlanLoadError,
  PlanNotFound,
} from "./CheckoutStates";
import { useCheckoutPlan } from "./useCheckoutPlan";

interface CheckoutContentProps {
  requestedPlanId: string | null;
}

// Authenticated checkout: resolves the plan and switches between the four screen states.
export default function CheckoutContent({
  requestedPlanId,
}: CheckoutContentProps) {
  const { state, retry } = useCheckoutPlan(requestedPlanId);
  // The one aria-live message for the whole page; every announcer writes here.
  const [announcement, setAnnouncement] = useState("Cargando tu plan");

  useEffect(() => {
    if (state.status === "loading") setAnnouncement("Cargando tu plan");
    if (state.status === "empty") setAnnouncement("No encontramos este plan");
  }, [state.status]);

  return (
    <CheckoutLayout
      announcement={announcement}
      isBusy={state.status === "loading"}
    >
      {state.status === "loading" && (
        <>
          <PageTitle />
          <CheckoutSkeleton />
        </>
      )}
      {state.status === "error" && (
        <>
          <PageTitle />
          <PlanLoadError onRetry={retry} />
        </>
      )}
      {state.status === "empty" && (
        <>
          <PageTitle />
          <PlanNotFound />
        </>
      )}
      {state.status === "ready" && (
        <CheckoutReady plan={state.plan} announce={setAnnouncement} />
      )}
    </CheckoutLayout>
  );
}
