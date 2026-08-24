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

function buildStats(
  days: number,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    range: { days, from: "2026-08-01", to: "2026-08-03" },
    newUsers: { total: 12, byDay: byDay([2, 5, 5]) },
    activeUsers: { total: 40 },
    cycleReports: { total: 18, byDay: byDay([6, 6, 6]) },
    conversations: { total: 30, byDay: byDay([10, 8, 12]) },
    retention: { newUsersInRange: 12, returned: 6, rate: 0.5 },
    ...overrides,
  };
}

const EMPTY_STATS = buildStats(30, {
  newUsers: { total: 0, byDay: byDay([0, 0, 0]) },
  activeUsers: { total: 0 },
  cycleReports: { total: 0, byDay: byDay([0, 0, 0]) },
  conversations: { total: 0, byDay: byDay([0, 0, 0]) },
  retention: { newUsersInRange: 0, returned: 0, rate: 0 },
});

test.describe("Admin Dashboard — stats", () => {
  test("happy path — muestra la fila de KPIs (nuevas usuarias, activas, retención, conversaciones, reportes de ciclo)", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, buildStats(30)),
    );

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("kpi-card-new-users")).toContainText("12");
    await expect(page.getByTestId("kpi-card-active-users")).toContainText("40");
    await expect(page.getByTestId("kpi-card-retention")).toContainText("50%");
    await expect(page.getByTestId("kpi-card-conversations")).toContainText(
      "30",
    );
    await expect(page.getByTestId("kpi-card-cycle-reports")).toContainText(
      "18",
    );
  });

  test("estado vacío — sin actividad en absoluto", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, EMPTY_STATS),
    );

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("dashboard-empty")).toBeVisible();
    await expect(page.getByTestId("dashboard-content")).toHaveCount(0);
  });

  test("estado de error — muestra mensaje y reintentar recupera los datos", async ({
    page,
  }) => {
    await seedAuthToken(page);
    let shouldFail = true;
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) => {
      if (shouldFail) {
        return fulfillJson(route, { message: "Internal error" }, 500);
      }
      return fulfillJson(route, buildStats(30));
    });

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("dashboard-error")).toBeVisible();

    shouldFail = false;
    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByTestId("dashboard-error")).toHaveCount(0);
    await expect(page.getByTestId("kpi-card-new-users")).toContainText("12");
  });

  test("cambio de rango — refetch mantiene datos visibles y anuncia el resultado", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) => {
      const url = new URL(route.request().url());
      const days = Number(url.searchParams.get("days") ?? "30");
      return fulfillJson(
        route,
        buildStats(days, {
          newUsers: { total: days, byDay: byDay([1, 1, days - 2]) },
        }),
      );
    });

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("kpi-card-new-users")).toContainText("30");

    await page.getByTestId("range-selector").click();
    await page.getByRole("option", { name: "7 días" }).click();

    await expect(page.getByTestId("kpi-card-new-users")).toContainText("7");
    await expect(page.getByTestId("dashboard-live-region")).toHaveText(
      "Mostrando datos de los últimos 7 días.",
    );
  });
});

test.describe("Admin Dashboard — nav sin links muertos", () => {
  test("Dashboard/Users/Reports navegan a rutas válidas", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, buildStats(30)),
    );
    await page.route(`${API_URL}/admin/dashboard/users*`, (route) =>
      fulfillJson(route, {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    );
    await page.route(`${API_URL}/lila/forms`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/admin/subscription/stats`, (route) =>
      fulfillJson(route, {
        totalSubscribers: 0,
        byStatus: { active: 0, past_due: 0, canceled: 0 },
        byPlan: [],
        mrrInCents: 0,
      }),
    );
    await page.route(`${API_URL}/admin/subscription/subscribers*`, (route) =>
      fulfillJson(route, { items: [], nextCursor: null }),
    );
    await page.route(`${API_URL}/lila/plans`, (route) =>
      fulfillJson(route, []),
    );

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();

    await page.getByRole("link", { name: "Users" }).click();
    await expect(page.getByTestId("users-page")).toBeVisible();

    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByTestId("reports-page")).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  });
});

test.describe("Admin Users", () => {
  test("estado vacío — sin usuarias todavía", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/users*`, (route) =>
      fulfillJson(route, {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    );

    await page.goto(`${BASE_URL}/admin/users`);

    await expect(page.getByTestId("users-table-empty")).toBeVisible();
  });

  test("estado de error — muestra mensaje si la API falla", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/users*`, (route) =>
      fulfillJson(route, { message: "Internal error" }, 500),
    );

    await page.goto(`${BASE_URL}/admin/users`);

    await expect(page.getByTestId("users-error")).toBeVisible();
  });

  test("happy path — lista usuarias y abre el detalle al hacer click", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/users*`, (route) =>
      fulfillJson(route, {
        data: [
          {
            userId: "user-1",
            email: "usuaria@example.com",
            cycleReports: 3,
            conversations: 5,
            lastActivityAt: "2026-08-01T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    );
    await page.route(`${API_URL}/admin/dashboard/users/user-1`, (route) =>
      fulfillJson(route, {
        userId: "user-1",
        email: "usuaria@example.com",
        tiers: ["bienestar"],
        cycleReports: 3,
        conversations: 5,
        lastActivityAt: "2026-08-01T00:00:00.000Z",
      }),
    );

    await page.goto(`${BASE_URL}/admin/users`);

    await expect(page.getByTestId("user-row")).toHaveCount(1);
    await page.getByTestId("user-row").click();

    await expect(page.getByTestId("user-details")).toBeVisible();
    await expect(page.getByTestId("user-details")).toContainText(
      "usuaria@example.com",
    );
  });
});

test.describe("Admin Reports", () => {
  test("happy path — tabla de desglose diario", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, buildStats(30)),
    );

    await page.goto(`${BASE_URL}/admin/reports`);

    await expect(page.getByTestId("report-row")).toHaveCount(3);
  });

  test("estado de error — muestra mensaje si la API falla", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, { message: "Internal error" }, 500),
    );

    await page.goto(`${BASE_URL}/admin/reports`);

    await expect(page.getByTestId("reports-error")).toBeVisible();
  });
});
