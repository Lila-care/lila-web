import { useEffect, useState } from "react";
import { getActivePlans } from "@/api/subscription";

// `GET /subscription/plans` is public (no auth) and returns only plans with `status: 'active'`
// — `[]` if none exist, never a 404/403. `planId` staying `null` after loading is therefore a
// genuine empty state (no active plan configured), not an auth/permissions problem — surfaced
// to the user via `upgrade-plan-unavailable` in `UpgradeGateModal`, not a silent failure.
export function useActivePlan() {
  const [planId, setPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getActivePlans()
      .then((plans) => {
        setPlanId(plans[0]?.planId ?? null);
      })
      .catch(() => {
        setPlanId(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { planId, loading };
}
