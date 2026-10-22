import { useCallback, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { sendBroadcast, type BroadcastResult } from "@/api/notifications";
import {
  buildPayload,
  payloadSignature,
  toBroadcastError,
  type BroadcastError,
  type NotificationFormValues,
} from "@/Admin/notificationsFormat";

interface Simulation {
  result: BroadcastResult;
  // payloadSignature() of the form values the simulation was run with.
  signature: string;
}

// Drives the two deliberate steps of a broadcast: a dry-run simulation, and (separately) the
// real send. The real send is only allowed for the exact data that was simulated.
export function useBroadcast() {
  const { token } = useAuth();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [sendResult, setSendResult] = useState<BroadcastResult | null>(null);
  const [busy, setBusy] = useState<"simulating" | "sending" | null>(null);
  const [error, setError] = useState<BroadcastError | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const run = useCallback(
    async (values: NotificationFormValues, dryRun: boolean) => {
      if (!token) return;
      setBusy(dryRun ? "simulating" : "sending");
      setError(null);
      try {
        const result = await sendBroadcast(token, buildPayload(values, dryRun));
        if (dryRun) {
          setSimulation({ result, signature: payloadSignature(values) });
          setSendResult(null);
        } else {
          setSendResult(result);
          // One simulation unlocks one send: a second send needs a fresh simulation.
          setSimulation(null);
        }
      } catch (e) {
        const failure = toBroadcastError(e);
        if (failure.kind === "unavailable") setUnavailable(true);
        setError(failure);
        if (dryRun) setSimulation(null);
      } finally {
        setBusy(null);
      }
    },
    [token],
  );

  return {
    simulation,
    sendResult,
    busy,
    error,
    unavailable,
    simulate: (values: NotificationFormValues) => run(values, true),
    send: (values: NotificationFormValues) => run(values, false),
    clearError: () => setError(null),
  };
}
