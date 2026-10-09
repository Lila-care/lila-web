// Grid templates shared by a ledger's header and its rows so the columns always line up.
// Kept out of the component files so react-refresh keeps them component-only.

// Activity: 2x2 stacked below `xl` (Figma 768/375); from `xl`
// label | total (w96) | detail | trend (w160).
export const KPI_LEDGER_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_10rem]";

// Recent users: stacked list below `lg` (Figma 768/375); from `lg`
// email | conversations (w160) | cycle reports (w160) | last activity (w240).
export const RECENT_USERS_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_10rem_10rem_15rem]";

// Gestión de Planes (Figma, 1116px content at 1440): stacked list below `lg`; from `lg` the
// Figma column widths become fr ratios so the ledger scales down to 1280/1024 instead of
// overflowing. Plan 260 | Precio 170 | Ciclo 170 | Límite diario 180 | Estado 140 | Acciones 196.
export const PLANS_LEDGER_COLUMNS =
  "lg:grid-cols-[minmax(0,260fr)_minmax(0,170fr)_minmax(0,170fr)_minmax(0,180fr)_minmax(0,140fr)_minmax(0,196fr)]";

// Plan 220 | Código 200 | Valor 140 | Vigencia 200 | Estado 160 | Acciones 196.
export const DISCOUNTS_LEDGER_COLUMNS =
  "lg:grid-cols-[minmax(0,220fr)_minmax(0,200fr)_minmax(0,140fr)_minmax(0,200fr)_minmax(0,160fr)_minmax(0,196fr)]";

// Email 340 | Plan 200 | Estado 160 | Vence 200 | Origen 216.
export const SUBSCRIBERS_LEDGER_COLUMNS =
  "lg:grid-cols-[minmax(0,340fr)_minmax(0,200fr)_minmax(0,160fr)_minmax(0,200fr)_minmax(0,216fr)]";

// Users list (Figma 889:2375 / 894:4342): stacked two-line rows below `xl`; from `xl`
// email (flex) | stage | registered 100 | conversations 100 | reports 100 | last activity 110 |
// chevron 16. The stage column is 208px at 1280 and 250px (Figma 1440) from 1440.
export const USERS_LIST_COLUMNS =
  "grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_13rem_6.25rem_6.25rem_6.25rem_6.875rem_1rem] min-[1440px]:xl:grid-cols-[minmax(0,1fr)_15.625rem_6.25rem_6.25rem_6.25rem_6.875rem_1rem]";

// Funnel (Figma 886:2157): label | count 48 | % of previous step 44 | bar 100 | chevron 12.
export const FUNNEL_COLUMNS =
  "grid-cols-[minmax(0,1fr)_3rem_2.75rem_6.25rem_0.75rem]";
