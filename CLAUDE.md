# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start dev server (Vite HMR, port 5173)
npm run build       # Type-check (tsc -b) + production build
npm run type-check  # tsc -b --noEmit
npm run lint        # ESLint
npm run preview     # Serve the dist/ build locally
npm run test:e2e    # Playwright (starts the dev server itself, see playwright.config.ts)
```

Package manager: npm (there is a `package-lock.json`; don't introduce yarn/pnpm lockfiles).

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
  `/admin/reports`, `/admin/forms`.

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
`lila.ts`, plus `authFetch.ts`. Convention per file: TypeScript interfaces that mirror the ms-lila
DTO **exactly** (comments in `dashboard.ts` say this explicitly — "mirror BE contract exactly"),
then plain async functions (`fetchX(token, ...)`) that call `authFetch` and return typed data.
No React Query/SWR — data fetching is done via hooks that hold their own `useState`/`useEffect`.

### Admin dashboard (`src/Admin/`)
- `DashboardPage.tsx` — composes the stats view; `useDashboardStats.ts` fetches
  `GET /admin/dashboard/stats` for a selectable day range (`RangeSelector.tsx`).
- KAN-47 replaced the original hand-rolled section components (`NewUsersHeroCard.tsx`,
  `RetentionCard.tsx`, `EngagementSection.tsx`, `TrendSection.tsx` — all deleted) with a single
  KPI row built on `KPICard` from `@lila-care/design-system`. KAN-49/51/53 added 3 more
  sections below that row (`RevenueSection.tsx`, `TierSection.tsx`,
  `RecentUsersSection.tsx`), on `CategoryBreakdown` and `DataTable` (`variant="admin"`,
  `RecentUsersSection.tsx` is the first real consumer of `DataTable` in this repo) from the
  same package. `UsersTable.tsx`/`FormsTable.tsx` still build their own table manually with
  `@tanstack/react-table` — new tables should use `DataTable` instead, that manual pattern is
  not meant to be extended further.
- `UsersPage.tsx`/`UsersTable.tsx`/`UserDetails.tsx` — paginated users list + detail. Tables use
  raw `Table`/`TableHeader`/`TableBody`/... primitives wired manually with
  `@tanstack/react-table` (`useReactTable`, `ColumnDef[]`) — the same pattern repeats in
  `FormsTable.tsx`. There is no shared generic `<DataTable>` wrapper component in this repo yet.
- `FormsPage.tsx`/`FormEditor.tsx`/`FormQuestionBuilder.tsx` — onboarding form builder/editor.
- `dashboardFormat.ts` — pure formatting helpers (`formatDateShort`, `formatDateLong`,
  `describeTrend`). No date library dependency (`date-fns`/`dayjs`/etc.) — everything goes
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
