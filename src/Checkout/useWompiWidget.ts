import { useCallback, useEffect, useRef, useState } from "react";
import type { WidgetCheckoutParams, WidgetResult } from "./types";

const WIDGET_SCRIPT_SRC = "https://checkout.wompi.co/widget.js";

interface WidgetCheckoutInstance {
  open: (onResult: (result: WidgetResult) => void) => void;
}

declare global {
  interface Window {
    WidgetCheckout?: new (params: WidgetCheckoutParams) => WidgetCheckoutInstance;
  }
}

export type WidgetScriptStatus = "loading" | "ready" | "error";

// Module-level so concurrent callers (StrictMode remount, retry clicks) share one <script> tag.
let scriptLoad: Promise<void> | null = null;

function loadWidgetScript(): Promise<void> {
  if (window.WidgetCheckout) return Promise.resolve();
  if (scriptLoad) return scriptLoad;

  scriptLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.WidgetCheckout
        ? resolve()
        : reject(new Error("WidgetCheckout missing after script load"));
    script.onerror = () => {
      // Drop the failed tag so a retry appends a fresh one instead of reusing a dead node.
      script.remove();
      reject(new Error("Wompi widget script failed to load"));
    };
    document.head.appendChild(script);
  }).catch((error: Error) => {
    scriptLoad = null;
    throw error;
  });

  return scriptLoad;
}

// Loads Wompi's widget script on demand and exposes `open`. The widget only opens as a modal
// overlay controlled by Wompi — it cannot be embedded in the page.
export function useWompiWidget() {
  const [status, setStatus] = useState<WidgetScriptStatus>("loading");
  const hasRequestedRef = useRef(false);

  const load = useCallback(() => {
    setStatus("loading");
    loadWidgetScript()
      .then(() => setStatus("ready"))
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    // Guard against StrictMode's double effect run: one load attempt per mount.
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    load();
  }, [load]);

  const open = useCallback(
    (
      params: WidgetCheckoutParams,
      onResult: (result: WidgetResult) => void,
    ) => {
      if (!window.WidgetCheckout) {
        throw new Error("WidgetCheckout is not loaded");
      }
      new window.WidgetCheckout(params).open(onResult);
    },
    [],
  );

  return { status, retry: load, open };
}
