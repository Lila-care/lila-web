import { useCallback, useState } from "react";
import { getCheckoutSignature } from "@/api/subscription";

// --- Wompi Widget Checkout types ---
//
// NOTE on `result.transaction`: the exact shape returned by the callback — in particular
// whether a `paymentSourceId` for recurring charges comes back directly on it, vs. requiring
// a separate tokenization/payment sources call — needs to be verified end-to-end with a real
// Wompi transaction. Do not block the rest of the subscription feature on this.
interface WompiWidgetConfig {
  currency: string;
  amountInCents: number;
  reference: string;
  publicKey: string;
  // Wompi's WidgetCheckout uses "signature:integrity" (not "signature") for the SHA256
  // integrity hash. Passing it under "signature" triggers "La firma es inválida" because
  // the widget treats them as two distinct fields with different validators.
  "signature:integrity": string;
  redirectUrl?: string;
}

interface WompiWidgetTransactionResult {
  id?: string;
  status?: string;
  paymentSourceId?: string | null;
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
  string | undefined;

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

export interface WompiCheckoutResult {
  transactionId: string;
  status: string;
  // Null for Nequi and other non-tokenizable methods. Only set for card
  // payments that support recurring charges.
  paymentSourceId: string | null;
}

interface UseWompiCheckoutReturn {
  isOpening: boolean;
  error: string | null;
  // Resolves with the transaction result on widget close, or `null` if the
  // widget wasn't configured, the user closed it without paying, or it failed.
  openCheckout: (
    params: OpenCheckoutParams,
  ) => Promise<WompiCheckoutResult | null>;
}

export function useWompiCheckout(): UseWompiCheckoutReturn {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = useCallback(
    async (params: OpenCheckoutParams): Promise<WompiCheckoutResult | null> => {
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

        const { signature } = await getCheckoutSignature(
          params.reference,
          params.amountInCents,
        );

        return await new Promise<WompiCheckoutResult | null>((resolve) => {
          const checkout = new window.WidgetCheckout!({
            currency: "COP",
            amountInCents: params.amountInCents,
            reference: params.reference,
            publicKey: WOMPI_PUBLIC_KEY,
            "signature:integrity": signature,
          });
          checkout.open((result) => {
            if (!result.transaction?.id) {
              // Widget closed without completing a transaction
              resolve(null);
              return;
            }
            resolve({
              transactionId: result.transaction.id,
              status: result.transaction.status ?? "UNKNOWN",
              paymentSourceId: result.transaction.paymentSourceId ?? null,
            });
          });
        });
      } catch (err) {
        // Wompi's widget.js throws plain strings (e.g. "Wompi Widget Error:\nLa firma es inválida")
        // instead of Error instances — surface the actual message so it's actionable in dev.
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : "Error al abrir el widget de pagos";
        setError(message);
        return null;
      } finally {
        setIsOpening(false);
      }
    },
    [],
  );

  return { isOpening, error, openCheckout };
}
