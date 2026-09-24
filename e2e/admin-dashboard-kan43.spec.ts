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

test.describe("Admin Dashboard — ingresos, tier y usuarias recientes (Ledger v2)", () => {
  test("Ingresos — MRR en COP como figura principal + ledgers por estado y por plan", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("mrr-value")).toHaveText(/\$\s42\.000/);
    await expect(page.getByTestId("mrr-block")).toContainText("84 suscriptoras");

    const active = page.getByTestId("breakdown-status-active");
    await expect(active).toContainText("Activas");
    await expect(active).toContainText("70");
    await expect(active).toContainText(/83\s%/);
    // Los estados se distinguen por forma del marcador, no por color.
    await expect(active.getByTestId("status-marker-filled")).toBeVisible();
    await expect(
      page
        .getByTestId("breakdown-status-past_due")
        .getByTestId("status-marker-half"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("breakdown-status-canceled")
        .getByTestId("status-marker-ring"),
    ).toBeVisible();

    await expect(page.getByTestId("breakdown-plan-plan-monthly")).toContainText(
      "Mensual",
    );
    await expect(page.getByTestId("breakdown-plan-plan-annual")).toContainText(
      "Anual",
    );
    // "Por plan" no lleva marcador.
    await expect(
      page.getByTestId("breakdown-plan").locator("[data-testid^=status-marker]"),
    ).toHaveCount(0);
  });

  test("Ingresos — sin suscriptoras muestra mensaje en vez de filas vacías", async ({
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

    await expect(page.getByTestId("breakdown-status")).toContainText(
      "Todavía no hay suscripciones",
    );
    await expect(page.getByTestId("mrr-value")).toHaveText(/\$\s0/);
  });

  test("Perfiles por tier — conteos + barra, sin porcentaje, con nota de solapamiento", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    const bienestar = page.getByTestId("breakdown-tier-bienestar");
    await expect(bienestar).toContainText("Bienestar");
    await expect(bienestar).toContainText("61");
    await expect(bienestar).not.toContainText("%");
    await expect(bienestar.getByTestId("ledger-bar")).toBeVisible();
    await expect(page.getByTestId("breakdown-tier-clinico")).toContainText(
      "23",
    );
    await expect(page.getByTestId("tier-section")).toContainText(
      "Un perfil puede estar en ambos.",
    );
  });

  test("Usuarias recientes — ledger con fecha relativa y 'Sin email' si falta", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, [
      recentUser({ userId: "user-1", email: "reciente@example.com" }),
      recentUser({
        userId: "user-2",
        email: undefined,
        lastActivityAt: new Date(
          Date.now() - 30 * 60 * 60 * 1000,
        ).toISOString(),
      }),
    ]);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    const rows = page.getByTestId("recent-user-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("reciente@example.com");
    await expect(rows.nth(0)).toContainText("hace 2 h");
    await expect(rows.nth(1)).toContainText("Sin email");
    await expect(rows.nth(1)).toContainText("ayer");
  });

  test("Usuarias recientes — máximo 10 filas y ordenar por conversaciones", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(
      page,
      Array.from({ length: 12 }, (_, i) =>
        recentUser({
          userId: `user-${i}`,
          email: `u${i}@example.com`,
          conversations: i,
        }),
      ),
    );

    await page.goto(`${BASE_URL}/admin/dashboard`);

    const rows = page.getByTestId("recent-user-row");
    await expect(rows).toHaveCount(10);
    await expect(rows.first()).toContainText("u0@example.com");

    await page.getByTestId("recent-users-sort-conversations").click();
    await expect(rows.first()).toContainText("u9@example.com");
  });

  test("Usuarias recientes — estado vacío con mensaje explícito", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockStats(page);
    await mockRecentUsers(page, []);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("recent-users-empty")).toHaveText(
      "Todavía no hay usuarias con actividad reciente.",
    );
  });

  test("Usuarias recientes — estado de error con reintentar", async ({
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
      .getByRole("button", { name: "Reintentar" })
      .click();

    await expect(page.getByTestId("recent-users-error")).toHaveCount(0);
    await expect(page.getByTestId("recent-users-section")).toContainText(
      "usuaria@example.com",
    );
  });

  test("viewport 375px — lista apilada sin ordenamiento, KPI rows apiladas, sin overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAuthToken(page);
    await mockStats(page);
    // Email largo a propósito — es la celda con más chance de forzar overflow.
    await mockRecentUsers(page, [
      recentUser({ email: "usuaria-con-un-email-bastante-largo@example.com" }),
    ]);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("recent-user-row")).toHaveCount(1);

    // Sin controles de orden ni header de columnas a 375.
    await expect(
      page.getByTestId("recent-users-sort-conversations"),
    ).toBeHidden();
    await expect(page.getByTestId("recent-user-row")).toContainText(
      "5 conversaciones",
    );

    // KPI row apilada: el detalle queda debajo del label, no en la misma línea.
    const row = page.getByTestId("kpi-row-new-users");
    const label = row.getByText("Nuevas usuarias");
    const detail = row.getByText(/Pico:/);
    const labelBox = await label.boundingBox();
    const detailBox = await detail.boundingBox();
    expect(labelBox && detailBox).toBeTruthy();
    if (labelBox && detailBox) {
      expect(detailBox.y).toBeGreaterThan(labelBox.y);
    }

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});
