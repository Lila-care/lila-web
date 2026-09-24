// Grid templates shared by a ledger's header and its rows so the columns always line up.
// Kept out of the component files so react-refresh keeps them component-only.

// Activity: 2x2 stacked below `md`; from `md` label | total (w96) | detail | trend (w160).
export const KPI_LEDGER_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_10rem]";

// Recent users: stacked list below `lg` (Figma 768/375); from `lg`
// email | conversations (w160) | cycle reports (w160) | last activity (w240).
export const RECENT_USERS_COLUMNS =
  "grid-cols-[auto_auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_10rem_10rem_15rem]";
