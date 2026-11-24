/** Kept free of asset imports so Playwright specs can import it. */
/**
 * Store listings for the download section.
 * TODO(KAN-166): placeholders. Replace with the real App Store / TestFlight and
 * Google Play URLs once the user confirms them.
 */
export const STORE_LINKS = {
  appStore: "https://testflight.apple.com/join/nDG6g9cY", // TestFlight público; cambiar al link de App Store cuando se publique
  playStore: "https://play.google.com/store/apps/details?id=care.lila.app", // TODO: real Android URL
} as const;
