# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev            # Start dev server (Vite HMR, port 5173)
yarn build          # Type-check (tsc -b) + production build
yarn type-check     # tsc -b --noEmit
yarn lint           # ESLint
yarn preview        # Serve the dist/ build locally
yarn test:e2e       # Playwright (starts the dev server itself, see playwright.config.ts)
```

Package manager: yarn 1 (the lockfile is `yarn.lock`; don't introduce npm/pnpm lockfiles).
`@lila-care/*` comes from GitHub Packages (`.npmrc` reads `NODE_AUTH_TOKEN`; the token needs
`read:packages`).

## Environment

- `VITE_API_URL` — backend base URL (ms-lila)
- `VITE_AUTH_DOMAIN`, `VITE_CLIENT_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_REDIRECT_URI` — Cognito
  OAuth (admin login via Google IdP)
- `VITE_WOMPI_PUBLIC_KEY` / `WOMPI_INTEGRITY_KEY` — Wompi checkout (Colombian payment gateway;
  confirms MRR/subscription amounts are COP)

## Architecture

React 19 + TypeScript + Vite SPA, Tailwind CSS v4, routed with **wouter** (not react-router).
UI primitives come from the published `@lila-care/design-system` package (`^0.3.0`), not local
shadcn copies — check that package's exports before building a new primitive from scratch.

### Routes (`src/App.tsx`)
Single `<Switch>`, two route families:
- **Consumer app** (no auth guard in the router itself): `/hoy`, `/chat`, `/calendario`,
  `/aprende`, `/perfil`, `/perfil/privacidad`, `/login` (`UserLogin.tsx`), `/terms`.
- **Admin** (`src/Admin/`), Cognito-gated: `/admin` (login), `/admin/change-password`,
  `/auth/callback`, and behind `<ProtectedRoute>`: `/admin/dashboard`, `/admin/users`,
  `/admin/reports`, `/admin/forms`, `/admin/plans`.

### Auth (`src/auth/`)
- `AuthContext.tsx` — persists Cognito tokens in `localStorage` under keys it exports
  (`TOKEN_KEY`, `ACCESS_TOKEN_KEY`, `REFRESH_TOKEN_KEY`, `EXPIRES_AT_KEY`) so non-hook modules
  (`src/api/*.ts`) can read/write the same storage without needing the hook.
  Manages the current `idToken`/`accessToken` and expiry.
- `ProtectedRoute.tsx` — redirects to `/admin` when unauthenticated.
- `src/api/authFetch.ts` — the `fetch` wrapper every authenticated API call must use. Attaches
  `Authorization: Bearer <idToken>`; on a `401` it does **one** refresh-and-retry via
  `POST /auth/refresh` (de-duplicated across concurrent 401s with an in-flight promise so
  parallel calls don't race the refresh), then force-logs-out and redirects to `/admin` if the
  refresh itself fails. Never call the admin API with a bare `fetch` — use `authFetch`.

### API layer (`src/api/`)
One file per backend domain: `dashboard.ts`, `users.ts`, `forms.ts`, `cycleTracking.ts`,
`lila.ts`, `plans.ts`, `discounts.ts`, `subscribers.ts`, plus `authFetch.ts`. Convention per file: TypeScript interfaces that mirror the ms-lila
DTO **exactly** (comments in `dashboard.ts` say this explicitly — "mirror BE contract exactly"),
then plain async functions (`fetchX(token, ...)`) that call `authFetch` and return typed data.
No React Query/SWR — data fetching is done via hooks that hold their own `useState`/`useEffect`.

### Admin dashboard (`src/Admin/`)
- `DashboardPage.tsx` — composes the stats view; `useDashboardStats.ts` fetches
  `GET /admin/dashboard/stats` for a selectable day range (`RangeSelector.tsx`).
- Dashboard v2 "Ledger" (Figma `fAVj1toZn8nIMNc2GBblKY`, page `304:9`) replaced the KPICard/
  CategoryBreakdown/DataTable cards with flat ledger rows: no shadows, gradients or nested cards,
  and the MRR figure is the only strong element. Sections: `RevenueSection.tsx` (MRR + status/plan
  breakdowns), `ActivitySection.tsx` (5 KPI rows with sparklines; stacked layout below `xl`),
  `TierSection.tsx`, `RecentUsersSection.tsx` (`GET /admin/dashboard/users/recent`, fetched once,
  no polling — each call scans full tables in ms-lila). Ledger primitives are LOCAL in
  `src/Admin/ledger/` (SectionTitle, KpiLedgerRow, BreakdownLedgerRow, LedgerBar, Sparkline on
  recharts, StatusMarker, RecentUsersLedger, skeleton/error/missing-value) — candidates to promote
  to `@lila-care/design-system` later.
- `src/Admin/ledger/ledger-tokens.css` holds tokens NOT yet approved (`--teal-700`, `--teal-500`,
  `--radius-xs`, `--border-strong`, `type-*` text utilities), all marked
  `PENDING design-token-sync approval`. Move them to the package's `tokens.css` once approved.
  Text utilities use the `type-` prefix on purpose: `cn()`/tailwind-merge treats unknown `text-*`
  classes as colors and drops them.
- Radius: before `@lila-care/design-system@0.4.1`, `rounded-sm/md/lg/xl` rendered square (the
  package built them as `calc()` over an undefined `--radius`). Fixed in 0.4.1 (`--radius: 12px`
  → sm 8px, md 10px, lg 12px, xl 16px); use `rounded-sm` for Figma's radius/sm (8px).
- `AdminLayout.tsx` + `AdminNavItem.tsx` — shared shell for every admin page: 220px sidebar
  (`lg+`), 80px rail with labels (`md`), fixed bottom tab bar + "Cerrar sesión" link at the end
  of the content (below `md`). Active item = semibold label + 2px teal mark, never a filled box.
  `index.css` has an unlayered `a:hover { color }`, so nav colors go on the inner icon/label, not
  on the link.
- Gestión de Planes (`/admin/plans`, Figma `fAVj1toZn8nIMNc2GBblKY`, 375 frame `332:2255`) —
  `PlansPage.tsx` orchestrates 3 tabs (`LedgerTabs`, local state, not in the URL): Planes /
  Descuentos / Suscriptoras, over ms-lila `admin/subscription/{plans,discounts,subscribers}`.
  Data: `usePlans` (plans + active discounts → inline promo via `resolvePlanPromo`), `useDiscounts`,
  `useSubscribers(enabled)` (cursor pagination, only requested once its tab opens — each call
  scans the table). `PlansTabSections.tsx` holds the per-tab 4 states; `PlansLedger`/
  `DiscountsLedger`/`SubscribersLedger` render rows via `ledger/ResponsiveLedgerRow` (stacked
  below `lg`, the stacked row itself is the edit trigger; grid from `lg` with the Figma widths as
  fr ratios in `ledgerColumns.ts`). `PlanPanel`/`DiscountPanel` sit in `ledger/SidePanel`
  (radix-ui `Dialog`: scrim + 420px sheet on `bg-card`, full width below `md`; Escape/scrim/✕
  all go through the owner's close handler, which confirms unsaved changes; focus starts on the
  first field and returns to the opener, or to the page `h1` if the opener is gone). Business rules kept from PR #41: deactivating a plan needs a
  second "¿Confirmar desactivación?" click; only an active `static` discount strikes through a
  plan's price (`custom` codes never do); Suscriptoras is read-only. Discount windows are
  Colombian calendar days: written as `YYYY-MM-DDT00:00:00-05:00` / `T23:59:59.999-05:00` and
  read back with the same fixed UTC-5 offset (`bogotaDate.ts`), whatever the browser timezone.
  Editing a discount PATCHes only the changed fields (no request if nothing changed). Hooks keep
  rows mounted on refetch (`loading` = first load only, `refreshing` after) and drop stale
  responses; a failed "Cargar más" is inline (`loadMoreError`) and retries the same cursor.
  `src/api/http.ts` (`handleResponse` → typed `ApiError` with status + Nest `message`
  string/array) backs plans/discounts/subscribers; `plansErrors.ts` maps ms-lila's messages to
  Spanish copy with a generic fallback — raw BE text never reaches the UI. Copy/formatters live
  in `plansFormat.ts`. No white page surfaces: only the side panel uses the card surface.
- Ledger primitives added for Planes (also local, promotion candidates): `LedgerTabs`,
  `LedgerEmptyState` (dashed box), `LedgerButton` (package `Button` minus gradient/shadow/scale,
  radius-lg) + `TextButton` (inline primary text action), `FormField` + `FIELD_CONTROL_CLASS`,
  `SidePanel`/`SidePanelFooter`. `ledger-tokens.css` gained `--overlay-scrim` and
  `type-h1`/`type-h2`/`type-h3`/`type-label-sm-strong`, all PENDING design-token-sync approval.
- `UsersTable.tsx`/`FormsTable.tsx` still build their own table manually with
  `@tanstack/react-table`.
- `UsersPage.tsx`/`UsersTable.tsx`/`UserDetails.tsx` — paginated users list + detail. Tables use
  raw `Table`/`TableHeader`/`TableBody`/... primitives wired manually with
  `@tanstack/react-table` (`useReactTable`, `ColumnDef[]`) — the same pattern repeats in
  `FormsTable.tsx`. There is no shared generic `<DataTable>` wrapper component in this repo yet.
- `FormsPage.tsx`/`FormEditor.tsx`/`FormQuestionBuilder.tsx` — onboarding form builder/editor.
- `dashboardFormat.ts` — pure formatting helpers (`formatDateLong`, `formatCurrency`, `formatCount`,
  `formatPercent`, `findPeak`/`describePeak`, `formatRelativeDate`, `describeTrend`). No date library dependency (`date-fns`/`dayjs`/etc.) — everything goes
  through native `Intl`/`Date`. Follow this convention for any new formatter instead of adding
  a dependency.
- `Login.tsx`/`ChangePassword.tsx`/`AuthCallback.tsx`/`AdminLayout.tsx` — admin auth shell.

### Testing
Playwright E2E only (`e2e/*.spec.ts`), no unit test runner configured. `playwright.config.ts`
boots the dev server itself (`npm run dev`) against `http://localhost:5173` unless
`PLAYWRIGHT_BASE_URL` is set — don't assume a server is already running when writing tests.

---

## Responsable

- slack_user: @cniebles
- slack_user_id: U08F9MDNE21
