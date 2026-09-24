import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function fakeIdToken(): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "admin-e2e",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "admin@lila.app",
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

async function seedAuthToken(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    (t) => localStorage.setItem("lila_id_token", t),
    fakeIdToken(),
  );
}

function byDay(counts: number[], startDay = 1) {
  return counts.map((count, i) => ({
    date: `2026-08-${String(startDay + i).padStart(2, "0")}`,
    count,
  }));
}

// Mirrors `buildStats` from `admin-dashboard.spec.ts` plus the two KAN-43 fields
// (`subscriptions`/`profileTiers`) that extend `DashboardStatsDto` — kept as a separate
// duplicate here (not imported) since the existing spec doesn't export it and this repo has
// no shared e2e helpers file (every `e2e/*.spec.ts` builds its own fixtures).
function buildStats(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    range: { days: 30, from: "2026-08-01", to: "2026-08-03" },
    newUsers: { total: 12, byDay: byDay([2, 5, 5]) },
    activeUsers: { total: 40 },
    cycleReports: { total: 18, byDay: byDay([6, 6, 6]) },
    conversations: { total: 30, byDay: byDay([10, 8, 12]) },
    retention: { newUsersInRange: 12, returned: 6, rate: 0.5 },
    subscriptions: {
      totalSubscribers: 84,
      byStatus: { active: 70, past_due: 9, canceled: 5 },
      byPlan: [
        { planId: "plan-monthly", planName: "Mensual", count: 60 },
        { planId: "plan-annual", planName: "Anual", count: 24 },
      ],
      mrrInCents: 4_200_000,
    },
    profileTiers: { bienestar: 61, clinico: 23 },
    ...overrides,
  };
}

function recentUser(
  overrides: Partial<{
    userId: string;
    email: string | undefined;
    cycleReports: number;
    conversations: number;
    lastActivityAt: string | null;
  }> = {},
) {
  return {
    userId: "user-1",
    email: "usuaria@example.com",
    cycleReports: 3,
    conversations: 5,
    lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

async function mockStats(page: Page, overrides = {}) {
  await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
    fulfillJson(route, buildStats(overrides)),
  );
}

async function mockRecentUsers(
  page: Page,
  body: unknown[] | { status: number },
) {
  await page.route(`${API_URL}/admin/dashboard/users/recent*`, (route) => {
    if (!Array.isArray(body)) {
      return fulfillJson(route, { message: "Internal error" }, body.status);
    }
    return fulfillJson(route, body);
  });
}

test.describe("Admin Dashboard — KAN-43 (ingresos, tier, usuarias recientes)", () => {
  test("RevenueSection — MRR formateado como COP y 2 CategoryBreakdown con datos reales", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("revenue-section")).toBeVisible();
    await expect(page.getByTestId("kpi-card-mrr")).toContainText("$");
    await expect(page.getByTestId("kpi-card-mrr")).toContainText("42.000");

    await expect(page.getByTestId("category-breakdown-status")).toContainText(
      "Activas",
    );
    await expect(page.getByTestId("category-breakdown-status")).toContainText(
      "70",
    );
    await expect(page.getByTestId("category-breakdown-plan")).toContainText(
      "Mensual",
    );
    await expect(page.getByTestId("category-breakdown-plan")).toContainText(
      "Anual",
    );
  });

  test("RevenueSection — sin suscriptores muestra mensaje en vez de barras vacías", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page, {
      subscriptions: {
        totalSubscribers: 0,
        byStatus: { active: 0, past_due: 0, canceled: 0 },
        byPlan: [],
        mrrInCents: 0,
      },
    });
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("category-breakdown-status")).toContainText(
      "Todavía no hay suscripciones",
    );
  });

  test("TierSection — barra apilada con conteos reales del BE", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("category-breakdown-tier")).toContainText(
      "Bienestar",
    );
    await expect(page.getByTestId("category-breakdown-tier")).toContainText(
      "61",
    );
    await expect(page.getByTestId("category-breakdown-tier")).toContainText(
      "Clínico",
    );
    await expect(page.getByTestId("category-breakdown-tier")).toContainText(
      "23",
    );
  });

  test("RecentUsersSection — tabla con 4 columnas y fecha relativa", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, [
      recentUser({ userId: "user-1", email: "reciente@example.com" }),
    ]);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("recent-users-section")).toBeVisible();
    await expect(page.getByTestId("recent-users-section")).toContainText(
      "reciente@example.com",
    );
    await expect(page.getByTestId("recent-users-section")).toContainText(
      "hace 2 h",
    );
  });

  test("RecentUsersSection — estado vacío con mensaje explícito si no hay usuarias recientes", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("recent-users-empty")).toBeVisible();
    await expect(page.getByTestId("recent-users-empty")).toContainText(
      "Todavía no hay usuarias con actividad reciente.",
    );
  });

  test("RecentUsersSection — estado de error con reintentar", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    let shouldFail = true;
    await page.route(`${API_URL}/admin/dashboard/users/recent*`, (route) => {
      if (shouldFail) {
        return fulfillJson(route, { message: "Internal error" }, 500);
      }
      return fulfillJson(route, [recentUser()]);
    });

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("recent-users-error")).toBeVisible();

    shouldFail = false;
    await page
      .getByTestId("recent-users-error")
      .getByRole("button", {
        name: "Reintentar",
      })
      .click();

    await expect(page.getByTestId("recent-users-error")).toHaveCount(0);
    await expect(page.getByTestId("recent-users-section")).toContainText(
      "usuaria@example.com",
    );
  });

  test("viewport 375px — sin overflow horizontal en las 3 secciones nuevas", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await seedAuthToken(page);
    await mockStats(page);
    // Email largo a propósito — con 4 columnas es la celda con más chance de forzar overflow
    // si `RecentUsersSection` alguna vez pierde el wrapper `overflow-x-auto`.
    await mockRecentUsers(page, [
      recentUser({ email: "usuaria-con-un-email-bastante-largo@example.com" }),
    ]);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("recent-users-section")).toBeVisible();

    // Scoped to the 3 new sections, not `document.documentElement.scrollWidth` — the
    // `AdminLayout` top navbar (`Dashboard/Users/Reports/Forms` links, not touched by this
    // ticket) already overflows horizontally at 375px on *every* admin page today, including
    // ones this feature never touches (`/admin/users`, no new sections at all, scrollWidth
    // ~585px). That's a pre-existing, unrelated bug — flagged as a follow-up instead of fixed
    // here, since fixing the shared navbar's responsive behavior is out of scope for KAN-49/
    // 51/53 and risks a much bigger diff than this ticket's contract.
    for (const testId of [
      "revenue-section",
      "tier-section",
      "recent-users-section",
    ]) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
      }
    }
  });
});
