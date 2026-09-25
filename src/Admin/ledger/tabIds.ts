// DOM ids shared across the Planes page: each LedgerTabs tab ↔ its tabpanel (aria-controls /
// aria-labelledby), and the page title SidePanel falls back to when its opener is gone.
// Kept out of the component files so react-refresh keeps them component-only.
export function tabId(id: string): string {
  return `ledger-tab-${id}`;
}

export function tabPanelId(id: string): string {
  return `ledger-tabpanel-${id}`;
}

export const PLANS_PAGE_TITLE_ID = "plans-page-title";
