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

// KAN-43: `RecentUsersSection` fetches this endpoint unconditionally whenever the dashboard
// renders its success state — tests in this file that only care about the KPI row/nav still
// need it mocked, otherwise the unmocked request hits the real `VITE_API_URL`, gets a 401,
// and `authFetch` force-logs-out the fake token (redirect to `/admin`), failing unrelated
// assertions below. Covered for real (data/empty/error) in `admin-dashboard-kan43.spec.ts`.
async function mockRecentUsersEmpty(page: Page) {
  await page.route(`${API_URL}/admin/dashboard/users/recent*`, (route) =>
    fulfillJson(route, []),
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
    // KAN-43: `DashboardStatsDto` now requires these two fields — the sections that read
    // them (`RevenueSection`/`TierSection`) are covered by
    // `e2e/admin-dashboard-kan43.spec.ts`, so this fixture just needs valid shapes to avoid
    // crashing the page for tests in *this* file that don't care about revenue/tier.
    subscriptions: {
      totalSubscribers: 0,
      byStatus: { active: 0, past_due: 0, canceled: 0 },
      byPlan: [],
      mrrInCents: 0,
    },
    profileTiers: { bienestar: 0, clinico: 0 },
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

test.describe("Admin Dashboard — stats (Ledger v2)", () => {
  test("happy path — ledger de Actividad con totales, detalle y sparklines", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, buildStats(30)),
    );
    await mockRecentUsersEmpty(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("kpi-row-new-users-total")).toHaveText("12");
    await expect(page.getByTestId("kpi-row-active-users-total")).toHaveText(
      "40",
    );
    await expect(page.getByTestId("kpi-row-retention-total")).toHaveText(
      /50\s%/,
    );
    await expect(page.getByTestId("kpi-row-conversations-total")).toHaveText(
      "30",
    );
    await expect(page.getByTestId("kpi-row-cycle-reports-total")).toHaveText(
      "18",
    );

    // Detalle calculado de byDay (pico) y de retention (returned / newUsersInRange).
    await expect(page.getByTestId("kpi-row-new-users")).toContainText(
      "Pico: 5 el 2 ago",
    );
    await expect(page.getByTestId("kpi-row-retention")).toContainText(
      "6 de 12 nuevas volvieron",
    );
    await expect(page.getByTestId("kpi-row-active-users")).toContainText(
      "Escribieron o registraron ciclo",
    );

    // Sparkline solo en las 3 series con byDay; activas/retención muestran "—".
    await expect(
      page.getByTestId("activity-section").getByTestId("sparkline"),
    ).toHaveCount(3);
    await expect(
      page.getByTestId("kpi-row-active-users").getByTestId("missing-value"),
    ).toBeVisible();

    // Sin flechas de comparación: el BE no trae periodo anterior.
    await expect(page.getByTestId("activity-section")).not.toContainText("▲");
    await expect(page.getByTestId("activity-section")).not.toContainText("▼");
  });

  test("estado vacío — sin actividad en absoluto", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(route, EMPTY_STATS),
    );
    await mockRecentUsersEmpty(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("activity-empty")).toBeVisible();
    await expect(page.getByTestId("kpi-row-new-users")).toContainText(
      "Sin actividad en el periodo",
    );
    // Retención sin cohorte = valor ausente ("—"), nunca un "0 %" engañoso.
    await expect(
      page.getByTestId("kpi-row-retention-total").getByTestId("missing-value"),
    ).toBeVisible();
    await expect(page.getByTestId("revenue-section")).toContainText(
      "Todavía no hay suscripciones.",
    );
    await expect(page.getByTestId("breakdown-tier-empty")).toBeVisible();
    await expect(page.getByTestId("recent-users-empty")).toBeVisible();
  });

  test("actividad en 0 pero subscriptions/profileTiers con datos — ingresos y tier se renderizan igual", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
      fulfillJson(
        route,
        buildStats(30, {
          newUsers: { total: 0, byDay: byDay([0, 0, 0]) },
          activeUsers: { total: 0 },
          cycleReports: { total: 0, byDay: byDay([0, 0, 0]) },
          conversations: { total: 0, byDay: byDay([0, 0, 0]) },
          retention: { newUsersInRange: 0, returned: 0, rate: 0 },
          subscriptions: {
            totalSubscribers: 84,
            byStatus: { active: 70, past_due: 9, canceled: 5 },
            byPlan: [
              { planId: "plan-monthly", planName: "Mensual", count: 84 },
            ],
            mrrInCents: 4_200_000,
          },
          profileTiers: { bienestar: 61, clinico: 23 },
        }),
      ),
    );
    await mockRecentUsersEmpty(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("activity-empty")).toBeVisible();
    // Ingresos y tier son conteos globales — no se esconden porque el rango no tuvo actividad.
    await expect(page.getByTestId("revenue-section")).toContainText(
      "84 suscriptoras",
    );
    await expect(page.getByTestId("breakdown-tier-bienestar")).toContainText(
      "61",
    );
  });

  test("estado de error — mensaje + Reintentar, nav en tono neutral, y reintentar recupera", async ({
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
    await mockRecentUsersEmpty(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("dashboard-error")).toBeVisible();
    await expect(page.getByTestId("dashboard-error")).toContainText(
      "No pudimos cargar el dashboard.",
    );
    await expect(page.getByTestId("nav-active-mark")).toHaveClass(
      /bg-surface-brand-light/,
    );

    shouldFail = false;
    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByTestId("dashboard-error")).toHaveCount(0);
    await expect(page.getByTestId("kpi-row-new-users-total")).toHaveText("12");
    await expect(page.getByTestId("nav-active-mark")).toHaveClass(
      /bg-teal-500/,
    );
  });

  test("cambio de rango — 'Actualizando…' sin bajar opacidad, datos nuevos y anuncio", async ({
    page,
  }) => {
    await seedAuthToken(page);
    let releaseRefetch: () => void = () => {};
    const refetchGate = new Promise<void>((resolve) => {
      releaseRefetch = resolve;
    });
    await page.route(`${API_URL}/admin/dashboard/stats*`, async (route) => {
      const url = new URL(route.request().url());
      const days = Number(url.searchParams.get("days") ?? "30");
      if (days === 7) await refetchGate;
      return fulfillJson(
        route,
        buildStats(days, {
          newUsers: { total: days, byDay: byDay([1, 1, days - 2]) },
        }),
      );
    });
    await mockRecentUsersEmpty(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("kpi-row-new-users-total")).toHaveText("30");

    await page.getByTestId("range-selector").click();
    await page.getByRole("option", { name: "7 días" }).click();

    await expect(page.getByTestId("range-selector-loading")).toHaveText(
      "Actualizando…",
    );
    await expect(page.getByTestId("dashboard-content")).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(page.getByTestId("kpi-row-new-users-total")).toHaveText("30");

    releaseRefetch();

    await expect(page.getByTestId("kpi-row-new-users-total")).toHaveText("7");
    await expect(page.getByTestId("range-selector-loading")).toHaveCount(0);
    await expect(page.getByTestId("dashboard-live-region")).toHaveText(
      "Mostrando datos de los últimos 7 días.",
    );
  });
});

async function mockAdminPagesApis(page: Page) {
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
  await page.route(`${API_URL}/lila/forms`, (route) => fulfillJson(route, []));
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
  await page.route(`${API_URL}/lila/plans`, (route) => fulfillJson(route, []));
  // Registered last so it wins over the broader `/admin/dashboard/users*` mock above.
  await mockRecentUsersEmpty(page);
}

test.describe("Admin layout — sidebar / rail / tab bar", () => {
  test("sidebar 1280 — navega entre las 4 secciones y marca la activa", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockAdminPagesApis(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    await expect(page.getByTestId("admin-sidebar")).toBeVisible();
    await expect(page.getByTestId("admin-tab-bar")).toBeHidden();
    await expect(page.getByTestId("nav-item-dashboard")).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: "Usuarias" }).click();
    await expect(page.getByTestId("users-page")).toBeVisible();
    await expect(page.getByTestId("nav-item-users")).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: "Reportes" }).click();
    await expect(page.getByTestId("reports-page")).toBeVisible();

    await page.getByRole("link", { name: "Formularios" }).click();
    await expect(page.getByTestId("forms-page")).toBeVisible();

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
    await expect(page.getByTestId("logout-button")).toBeVisible();

    // Wordmark "Lila Admin" en una sola línea (no apilado).
    const lila = await page
      .getByTestId("admin-sidebar")
      .getByText("Lila", { exact: true })
      .boundingBox();
    const admin = await page
      .getByTestId("admin-sidebar")
      .getByText("Admin", { exact: true })
      .boundingBox();
    expect(lila && admin).toBeTruthy();
    if (lila && admin) {
      expect(admin.x).toBeGreaterThan(lila.x + lila.width);
      expect(admin.y).toBeLessThan(lila.y + lila.height);
    }

    // Íconos del nav en teal-500 tanto activos como inactivos.
    for (const id of ["dashboard", "users"]) {
      await expect(
        page.getByTestId(`nav-item-${id}`).locator("svg"),
      ).toHaveCSS("color", "rgb(19, 196, 163)");
    }

    // RangeSelector con radio 8px (radius-sm de Figma).
    await expect(page.getByTestId("range-selector")).toHaveCSS(
      "border-radius",
      "8px",
    );
  });

  test("rail 768 — 80px, ícono con label debajo, alto completo y Actividad apilada", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await seedAuthToken(page);
    await mockAdminPagesApis(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("dashboard-content")).toBeVisible();
    const sidebar = page.getByTestId("admin-sidebar");
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box?.width).toBe(80);
    await expect(page.getByTestId("admin-tab-bar")).toBeHidden();

    // Label visible debajo del ícono.
    const usersItem = page.getByTestId("nav-item-users");
    await expect(usersItem.getByText("Usuarias")).toBeVisible();
    const icon = await usersItem.locator("svg").boundingBox();
    const label = await usersItem.getByText("Usuarias").boundingBox();
    expect(icon && label).toBeTruthy();
    if (icon && label) expect(label.y).toBeGreaterThan(icon.y + icon.height - 1);
    await expect(page.getByTestId("logout-button")).toContainText("Salir");

    // El fondo del rail cubre todo el alto del documento aunque el contenido sea largo.
    const pageHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(pageHeight).toBeGreaterThan(1024);
    expect(box?.height).toBeGreaterThanOrEqual(pageHeight - 1);

    // Actividad apilada: sin header de columnas, detalle completo debajo del label.
    await expect(
      page.getByTestId("activity-section").getByText("Indicador"),
    ).toBeHidden();
    const row = page.getByTestId("kpi-row-active-users");
    const rowLabel = await row.getByText("Usuarias activas").boundingBox();
    const detail = row.getByText("Escribieron o registraron ciclo");
    await expect(detail).toBeVisible();
    const detailBox = await detail.boundingBox();
    if (rowLabel && detailBox) expect(detailBox.y).toBeGreaterThan(rowLabel.y);

    // Perfiles por tier no ocupa todo el ancho (~316px).
    const tier = await page.getByTestId("tier-section").boundingBox();
    expect(tier?.width).toBeLessThanOrEqual(316 + 1);
  });

  test("tab bar 375 — reemplaza al sidebar, navega y no hay overflow horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAuthToken(page);
    await mockAdminPagesApis(page);

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("dashboard-content")).toBeVisible();
    await expect(page.getByTestId("admin-sidebar")).toBeHidden();
    await expect(page.getByTestId("admin-tab-bar")).toBeVisible();
    // Sin top bar: el logout es un link de texto al final del contenido.
    await expect(page.getByTestId("logout-button-mobile")).toHaveText(
      "Cerrar sesión",
    );
    const header = await page.getByRole("heading", { name: "Dashboard" }).boundingBox();
    expect(header?.y).toBeLessThan(80);

    // La tab bar no tapa el final del contenido.
    await page.getByTestId("logout-button-mobile").scrollIntoViewIfNeeded();
    const logoutBox = await page.getByTestId("logout-button-mobile").boundingBox();
    const tabBarBox = await page.getByTestId("admin-tab-bar").boundingBox();
    expect(logoutBox && tabBarBox).toBeTruthy();
    if (logoutBox && tabBarBox) {
      expect(logoutBox.y + logoutBox.height).toBeLessThanOrEqual(tabBarBox.y);
    }

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(375);

    await page.getByTestId("tab-item-users").click();
    await expect(page.getByTestId("users-page")).toBeVisible();
    await expect(page.getByTestId("tab-item-users")).toHaveAttribute(
      "aria-current",
      "page",
    );
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
