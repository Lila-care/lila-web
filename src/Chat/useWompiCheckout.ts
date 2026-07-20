import { useCallback, useState } from "react";

// --- Wompi Widget Checkout types ---
//
// NOTE (pending real Wompi credentials): `VITE_WOMPI_PUBLIC_KEY` is an empty placeholder in
// `.env.example` — there are no sandbox/production keys yet, so this hook has never been
// exercised end-to-end against a real Wompi environment. It is implemented per Wompi's
// documented `WidgetCheckout` API (script tag + config object + `.open(callback)`), but the
// exact shape of `result.transaction` — in particular whether a `paymentSourceId` for
// recurring charges comes back directly on it, vs. requiring a separate tokenization/payment
// sources call — needs to be verified once real keys are available. Do not block the rest of
// the subscription feature on this; report it as a follow-up item.
interface WompiWidgetConfig {
  currency: string;
  amountInCents: number;
  reference: string;
  publicKey: string;
  redirectUrl?: string;
}

interface WompiWidgetTransactionResult {
  id?: string;
  status?: string;
  paymentSourceId?: string;
}

interface WompiWidgetResult {
  transaction?: WompiWidgetTransactionResult;
}

interface WompiWidgetCheckoutInstance {
  open: (callback: (result: WompiWidgetResult) => void) => void;
}

declare global {
  interface Window {
    WidgetCheckout?: new (
      config: WompiWidgetConfig,
    ) => WompiWidgetCheckoutInstance;
  }
}

const WOMPI_SCRIPT_URL = "https://checkout.wompi.co/widget.js";
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as
  | string
  | undefined;

let scriptLoadingPromise: Promise<void> | null = null;

function loadWompiScript(): Promise<void> {
  if (window.WidgetCheckout) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WOMPI_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("No se pudo cargar el widget de pagos"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

interface OpenCheckoutParams {
  amountInCents: number;
  reference: string;
}

interface UseWompiCheckoutReturn {
  isOpening: boolean;
  error: string | null;
  // Resolves the `paymentSourceId` on success, or `null` if the widget isn't configured, the
  // user closed it, or it failed (see `error` in that case).
  openCheckout: (params: OpenCheckoutParams) => Promise<string | null>;
}

export function useWompiCheckout(): UseWompiCheckoutReturn {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = useCallback(
    async (params: OpenCheckoutParams): Promise<string | null> => {
      if (!WOMPI_PUBLIC_KEY) {
        setError(
          "Los pagos todavía no están configurados (falta VITE_WOMPI_PUBLIC_KEY).",
        );
        return null;
      }

      setIsOpening(true);
      setError(null);
      try {
        await loadWompiScript();
        if (!window.WidgetCheckout) {
          throw new Error("El widget de pagos no está disponible");
        }

        return await new Promise<string | null>((resolve) => {
          const checkout = new window.WidgetCheckout!({
            currency: "COP",
            amountInCents: params.amountInCents,
            reference: params.reference,
            publicKey: WOMPI_PUBLIC_KEY,
          });
          checkout.open((result) => {
            resolve(result.transaction?.paymentSourceId ?? null);
          });
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al abrir el widget de pagos",
        );
        return null;
      } finally {
        setIsOpening(false);
      }
    },
    [],
  );

  return { isOpening, error, openCheckout };
}
