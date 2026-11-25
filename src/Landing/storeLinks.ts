/** Kept free of asset imports so Playwright specs can import it. */
/** Store links for the download section. */
export const STORE_LINKS = {
  // Temporal (KAN-174): cuando Lila esté en el App Store, cambiar por la URL de la ficha.
  testFlight: "https://testflight.apple.com/join/rmxz9U4P",
  playStore: "https://play.google.com/store/apps/details?id=care.lila.app", // TODO: real Android URL
} as const;
