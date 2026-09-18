import { useCallback, useEffect, useRef } from "react";

function isWompiHost(hostname: string): boolean {
  return hostname === "wompi.co" || hostname.endsWith(".wompi.co");
}

function isVisibleWompiIframe(frame: HTMLIFrameElement): boolean {
  let hostname: string;
  try {
    hostname = new URL(frame.src).hostname;
  } catch {
    // An unparsable src is not a Wompi origin.
    return false;
  }
  return isWompiHost(hostname) && frame.getClientRects().length > 0;
}

// Wompi's widget normally reports every way out through its callback (paid, declined, closed).
// If its overlay vanishes WITHOUT calling it (crash, blocked, extension), "Pagar" would stay
// locked forever. This watchdog notices that when the tab regains focus.
//
// The overlay is Wompi's, so we don't rely on its markup beyond this: a VISIBLE <iframe> served
// from a Wompi origin that showed up after `captureBaseline()` (called right before opening) is
// the overlay. Unrelated iframes (ads, extensions, about:blank) never count: a false positive
// would unlock "Pagar" while the widget is really open and allow a double charge. Only an overlay
// we actually SAW appear and that is now gone from the DOM counts as abandoned; no timers.
//
// ASSUMPTION NOT YET VALIDATED against the real widget: that its overlay is such an iframe and
// that it is REMOVED (not just hidden) when closed.
export function useWidgetAbandonWatchdog(
  isWidgetOpen: boolean,
  onAbandoned: () => void,
) {
  const baselineRef = useRef<Set<Element>>(new Set());
  // Kept in a ref so a new callback identity never resets what the effect has already seen.
  const onAbandonedRef = useRef(onAbandoned);

  useEffect(() => {
    onAbandonedRef.current = onAbandoned;
  });

  const captureBaseline = useCallback(() => {
    baselineRef.current = new Set(document.querySelectorAll("iframe"));
  }, []);

  useEffect(() => {
    if (!isWidgetOpen) return;

    const seenOverlays = new Set<Element>();
    const trackNewIframes = () => {
      document.querySelectorAll("iframe").forEach((frame) => {
        if (!baselineRef.current.has(frame) && isVisibleWompiIframe(frame)) {
          seenOverlays.add(frame);
        }
      });
    };
    // The overlay is usually already in the DOM by the time this effect runs.
    trackNewIframes();
    const observer = new MutationObserver(trackNewIframes);
    // Attributes too: the overlay may get its src / become visible after being appended.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class", "hidden"],
    });

    const handleRegainedFocus = () => {
      if (document.visibilityState !== "visible") return;
      trackNewIframes();
      const wasSeenAndIsGone =
        seenOverlays.size > 0 &&
        [...seenOverlays].every((frame) => !frame.isConnected);
      if (wasSeenAndIsGone) onAbandonedRef.current();
    };
    window.addEventListener("focus", handleRegainedFocus);
    document.addEventListener("visibilitychange", handleRegainedFocus);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", handleRegainedFocus);
      document.removeEventListener("visibilitychange", handleRegainedFocus);
    };
  }, [isWidgetOpen]);

  return captureBaseline;
}
