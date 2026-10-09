import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

// Dashboard v3 + Usuarias v3 ("usuarias visibles"): every API call is mocked, nothing hits ms-lila.

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function fakeIdToken(): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const payload = {
    sub: "admin-e2e",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "admin@lila.app",
  };
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fakesignature`;
}

async function seedAuthToken(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    (t) => localStorage.setItem("lila_id_token", t),
    fakeIdToken(),
  );
}

// Exact-path matchers: the glob `/admin/dashboard/users*` would also swallow /recent,
// /attention and /:userId.
const isUsersList = (url: URL) => url.pathname === "/admin/dashboard/users";
const isRecent = (url: URL) => url.pathname === "/admin/dashboard/users/recent";
const isAttention = (url: URL) =>
  url.pathname === "/admin/dashboard/users/attention";
const isUserDetail = (url: URL) =>
  /^\/admin\/dashboard\/users\/(?!recent$|attention$)[^/]+$/.test(url.pathname);

const RANGE = { days: 30, from: "2026-09-09", to: "2026-10-08" };

function buildStats(overrides: Record<string, unknown> = {}) {
  const zero = RANGE.days;
  void zero;
  return {
    range: RANGE,
    newUsers: { total: 12, byDay: [{ date: "2026-10-01", count: 12 }] },
    activeUsers: { total: 40 },
    cycleReports: { total: 18, byDay: [{ date: "2026-10-01", count: 18 }] },
    conversations: { total: 30, byDay: [{ date: "2026-10-01", count: 30 }] },
    retention: { newUsersInRange: 12, returned: 6, rate: 0.5, unconfirmedCount: 3 },
    funnel: {
      registered: 100,
      confirmed: 80,
      onboardingStarted: 60,
      onboardingCompleted: 40,
      firstCycleReport: 20,
      firstConversation: 10,
      activeSubscription: 5,
    },
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

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    email: "usuaria@example.com",
    createdAt: "2026-09-12T15:00:00.000Z",
    accountStatus: "confirmed",
    provider: "password",
    stage: "onboarding_completed",
    onboarding: null,
    conversations: 2,
    cycleReports: 1,
    lastActivityAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: "none",
    checkoutAttempts: 0,
    attentionReason: null,
    ...overrides,
  };
}

function buildTimeline(reached: string[], detail?: string) {
  const keys = [
    "registered",
    "confirmed",
    "onboarding_started",
    "onboarding_question_reached",
    "onboarding_completed",
    "first_cycle_report",
    "first_conversation",
    "checkout_attempt",
    "subscription",
  ];
  return keys.map((key) => ({
    key,
    reachedAt: reached.includes(key) ? "2026-10-07T14:16:00.000Z" : null,
    ...(key === "onboarding_question_reached" && detail ? { detail } : {}),
  }));
}

function buildDetail(
  overrides: Record<string, unknown> = {},
  reached: string[] = ["registered", "confirmed", "onboarding_started"],
  stoppedAt: string | null = "onboarding_question_reached",
) {
  return {
    ...buildUser({
      stage: "onboarding_in_progress",
      onboarding: {
        currentQuestionIndex: 7,
        totalQuestions: 18,
        startedAt: "2026-10-07T14:00:00.000Z",
        updatedAt: "2026-10-07T14:16:00.000Z",
      },
      attentionReason: "onboarding_stalled",
    }),
    tiers: [],
    timeline: buildTimeline(reached, "7/18"),
    stoppedAt,
    summary: {
      conversations: 2,
      cycleReports: 0,
      plan: null,
      subscriptionStatus: "none",
      lastPayment: null,
    },
    ...overrides,
  };
}

function page1(data: unknown[], total = data.length, totalPages = 1) {
  return { data, total, page: 1, limit: 20, totalPages };
}

interface DashboardMocks {
  recent?: unknown[];
  attention?: unknown[];
  stats?: Record<string, unknown>;
}

async function mockDashboard(page: Page, mocks: DashboardMocks = {}) {
  await page.route(`${API_URL}/admin/dashboard/stats*`, (route) =>
    fulfillJson(route, buildStats(mocks.stats)),
  );
  await page.route(isRecent, (route) => fulfillJson(route, mocks.recent ?? []));
  await page.route(isAttention, (route) =>
    fulfillJson(route, mocks.attention ?? []),
  );
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(width);
}

test.describe("Dashboard v3 — embudo y atención", () => {
  test("embudo — 7 pasos con % del paso anterior y link al filtro por etapa", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockDashboard(page);
    const listRequests: URL[] = [];
    await page.route(isUsersList, (route) => {
      listRequests.push(new URL(route.request().url()));
      return fulfillJson(route, page1([buildUser()]));
    });

    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("funnel-section")).toBeVisible();
    await expect(page.locator('[data-testid^="funnel-row-"]:not([data-testid$="-count"])')).toHaveCount(7);
    await expect(page.getByTestId("funnel-row-confirmed")).toContainText("80 %");
    await expect(page.getByTestId("funnel-row-registered-count")).toHaveText("100");
    await expect(page.getByTestId("funnel-footnote")).toContainText(
      "% sobre el paso anterior. Tocá una fila para ver esas usuarias.",
    );
    await expect(page.getByTestId("funnel-footnote")).toContainText(
      "filtra por la etapa en la que está hoy la usuaria",
    );
    await expect(
      page.getByRole("heading", { name: "Embudo de usuarias" }),
    ).toBeVisible();
    await expect(page.getByTestId("funnel-section")).toContainText(
      /Registradas en \d+ días/,
    );
    await expect(page.getByTestId("funnel-row-registered")).toContainText("—");
    await expect(page.getByTestId("funnel-row-activeSubscription")).toContainText(
      "Suscripción activa",
    );

    await page.getByTestId("funnel-row-onboardingStarted").getByRole("link").click();

    await expect(page).toHaveURL(
      /\/admin\/users\?stage=onboarding_in_progress&from=2026-09-09&to=2026-10-08/,
    );
    await expect(page.getByTestId("user-row")).toHaveCount(1);
    expect(listRequests.at(-1)?.searchParams.get("stage")).toBe(
      "onboarding_in_progress",
    );
    expect(listRequests.at(-1)?.searchParams.get("from")).toBe("2026-09-09");
    // El select de etapa refleja el filtro (estado "aplicado").
    await expect(page.getByTestId("users-stage-filter")).toContainText(
      "Onboarding en curso",
    );
  });

  test("KPIs clickeables — Nuevas usuarias (from/to) y Usuarias activas (activeInRange)", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockDashboard(page);
    const listRequests: URL[] = [];
    await page.route(isUsersList, (route) => {
      listRequests.push(new URL(route.request().url()));
      return fulfillJson(route, page1([buildUser()]));
    });

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.getByTestId("kpi-row-active-users-link").click();

    await expect(page).toHaveURL(
      /\/admin\/users\?from=2026-09-09&to=2026-10-08&activeInRange=true/,
    );
    await expect(page.getByTestId("user-row")).toHaveCount(1);
    expect(listRequests.at(-1)?.searchParams.get("activeInRange")).toBe("true");

    await page.goto(`${BASE_URL}/admin/dashboard`);
    await page.getByTestId("kpi-row-new-users-link").click();
    await expect(page).toHaveURL(/\/admin\/users\?from=2026-09-09&to=2026-10-08$/);
  });

  test("nota de retención y definición de 'activa' accesible por foco", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockDashboard(page);
    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("retention-note")).toHaveText(
      "Incluye 3 cuentas sin confirmar",
    );
    // Retention note sits right under the Retention row; definitions line at the foot.
    const retentionRow = page.getByTestId("kpi-row-retention");
    await expect(retentionRow.locator("xpath=following-sibling::li[1]")).toHaveAttribute(
      "data-testid",
      "retention-note",
    );
    await expect(page.getByTestId("activity-definitions")).toHaveText(
      "Activa: escribió a Lila o registró un ciclo en el rango. Retención: nuevas usuarias que volvieron después de registrarse.",
    );
    await expect(page.getByTestId("kpi-row-new-users-link")).toHaveText("Nuevas usuarias ›");
    await expect(page.getByTestId("kpi-row-active-users-link")).toHaveText("Usuarias activas ›");
    await expect(page.getByTestId("active-users-definition")).toBeHidden();
    await page.getByTestId("active-users-definition-trigger").focus();
    await expect(page.getByTestId("active-users-definition")).toContainText(
      "escribió a Lila o registró un ciclo en el rango",
    );
    // WCAG 1.4.13: Escape descarta el tooltip sin mover el foco.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("active-users-definition")).toBeHidden();
    await expect(page.getByTestId("active-users-definition-trigger")).toBeFocused();
  });

  test("atención → detalle — razones en español, pista de typo y panel con 'Se detuvo acá'", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockDashboard(page, {
      attention: [
        buildDetail({ userId: "user-1", email: "camila@example.com" }),
        buildUser({
          userId: "user-2",
          email: "typo@gmail.con",
          accountStatus: "unconfirmed",
          stage: "unconfirmed",
          attentionReason: "unconfirmed_email",
        }),
        buildUser({
          userId: "user-3",
          email: "pago@example.com",
          stage: "onboarding_completed",
          checkoutAttempts: 2,
          attentionReason: "checkout_abandoned",
        }),
      ],
    });
    await page.route(isUserDetail, (route) => fulfillJson(route, buildDetail()));

    await page.goto(`${BASE_URL}/admin/dashboard`);

    const rows = page.getByTestId("attention-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Onboarding detenido en la pregunta 7 de 18");
    await expect(rows.nth(1)).toContainText("Email sin confirmar");
    await expect(rows.nth(1)).toContainText("¿posible error de tipeo?");
    await expect(rows.nth(2)).toContainText("Abrió el pago pero no lo completó (2 intentos)");
    await expect(page.getByTestId("attention-section")).not.toContainText("onboarding_stalled");
    // Marker per reason (Figma): stalled = half, unconfirmed = ring, checkout = half.
    await expect(rows.nth(0).getByTestId("stage-marker-half")).toBeVisible();
    await expect(rows.nth(1).getByTestId("stage-marker-ring")).toBeVisible();
    await expect(rows.nth(2).getByTestId("stage-marker-half")).toBeVisible();
    // "Ver todas ›" lives under the list, not in the header; no invented total.
    await expect(page.getByTestId("attention-view-all")).toHaveText("Ver todas ›");
    await expect(page.getByTestId("attention-section")).toContainText("3 usuarias");

    await rows.nth(0).getByRole("link").click();

    await expect(page).toHaveURL(/\/admin\/dashboard\?user=user-1/);
    const panel = page.getByTestId("user-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Todavía no completó el onboarding");
    await expect(panel).toContainText("Ingresó con contraseña");
    await expect(page.getByTestId("user-panel-meta")).toContainText("Sin tiers aún");
    await expect(page.getByTestId("user-panel-meta")).not.toContainText("Registrada el");
    // Figma has no scrim: the page behind stays visible and the open row is highlighted.
    await expect(page.getByTestId("user-panel-scrim")).toHaveCount(0);
    await expect(page.getByTestId("user-panel-close")).toContainText("Cerrar");
    await expect(page.getByTestId("recent-users-view-all")).toHaveText(
      "Ver todas las usuarias ›",
    );
    await expect(page.getByTestId("timeline-onboarding_question_reached")).toHaveAttribute(
      "data-state",
      "stopped",
    );
    await expect(page.getByTestId("timeline-onboarding_question_reached")).toContainText(
      "Pregunta 7 de 18 alcanzada",
    );
    await expect(page.getByTestId("timeline-onboarding_question_reached")).toContainText("Se detuvo acá");
    await expect(page.getByTestId("timeline-first_cycle_report")).toContainText("Aún no");
    await expect(page.getByTestId("timeline-first_cycle_report")).toHaveAttribute("data-state", "pending");
    await expect(page.getByTestId("timeline-registered")).toContainText("7 oct · 09:16");
    await expect(page.getByTestId("user-panel-privacy")).toContainText("No incluye el contenido");

    // Escape cierra el panel y devuelve el foco a la fila de origen.
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(rows.nth(0).getByRole("link")).toBeFocused();
  });

  test("atención — estado vacío 'Nadie requiere atención'", async ({ page }) => {
    await seedAuthToken(page);
    await mockDashboard(page);
    await page.goto(`${BASE_URL}/admin/dashboard`);
    await expect(page.getByTestId("attention-empty")).toHaveText("Nadie requiere atención");
  });

  test("atención — error con reintento", async ({ page }) => {
    await seedAuthToken(page);
    await mockDashboard(page);
    let fail = true;
    await page.route(isAttention, (route) =>
      fail
        ? fulfillJson(route, { message: "boom" }, 500)
        : fulfillJson(route, [buildDetail()]),
    );
    await page.goto(`${BASE_URL}/admin/dashboard`);

    await expect(page.getByTestId("attention-error")).toBeVisible();
    fail = false;
    await page.getByTestId("attention-error").getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("attention-row")).toHaveCount(1);
  });

  test("recientes — abre el panel desde el dashboard", async ({ page }) => {
    await seedAuthToken(page);
    await mockDashboard(page, { recent: [buildUser({ userId: "user-9" })] });
    await page.route(isUserDetail, (route) =>
      fulfillJson(route, buildDetail({ userId: "user-9", stage: "onboarding_completed", onboarding: null }, ["registered", "confirmed", "onboarding_started", "onboarding_question_reached", "onboarding_completed"], "first_cycle_report")),
    );
    await page.goto(`${BASE_URL}/admin/dashboard`);

    await page.getByTestId("recent-user-row").getByRole("link").click();

    await expect(page).toHaveURL(/\?user=user-9/);
    // Hito posterior al onboarding: se muestra "Aún no" pero NO se resalta "Se detuvo acá".
    await expect(page.getByTestId("timeline-first_cycle_report")).toHaveAttribute("data-state", "pending");
    await expect(page.getByTestId("user-panel")).not.toContainText("Se detuvo acá");
    await expect(page.getByTestId("user-panel-onboarding-note")).toHaveCount(0);
    // La fila abierta queda resaltada y la página no se oscurece (sin scrim).
    await expect(page.getByTestId("recent-user-row")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("user-panel-scrim")).toHaveCount(0);
    // Escape cierra y el foco vuelve al link de la fila.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("user-panel")).toHaveCount(0);
    await expect(page.getByTestId("recent-user-row").getByRole("link")).toBeFocused();
  });

  test("viewport 768 y 375 — embudo y atención apilados, sin overflow", async ({ page }) => {
    await seedAuthToken(page);
    await mockDashboard(page, {
      attention: [buildDetail({ email: "una-direccion-de-correo-muy-larga-para-probar@example.com" })],
      recent: [buildUser({ email: "otra-direccion-de-correo-muy-larga-para-probar@example.com" })],
    });

    for (const width of [768, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE_URL}/admin/dashboard`);
      await expect(page.getByTestId("attention-row")).toHaveCount(1);
      const funnel = await page.getByTestId("funnel-section").boundingBox();
      const attention = await page.getByTestId("attention-section").boundingBox();
      expect(funnel && attention).toBeTruthy();
      if (funnel && attention) expect(attention.y).toBeGreaterThan(funnel.y + funnel.height - 1);
      await expectNoHorizontalOverflow(page, width);
    }
  });
});

test.describe("Usuarias v3 — lista, filtros y panel", () => {
  test("lista — etapa, estado de cuenta y fecha en español, sin enums crudos", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(isUsersList, (route) =>
      fulfillJson(
        route,
        page1([
          buildUser({ userId: "u1", email: "a@example.com", stage: "subscribed" }),
          buildUser({
            userId: "u2",
            email: "b@example.com",
            stage: "onboarding_in_progress",
            onboarding: { currentQuestionIndex: 3, totalQuestions: 18, startedAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z" },
          }),
          buildUser({ userId: "u3", email: undefined, stage: "unconfirmed", accountStatus: "unconfirmed" }),
        ]),
      ),
    );

    await page.goto(`${BASE_URL}/admin/users`);

    const rows = page.getByTestId("user-row");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByTestId("user-row-stage")).toHaveText("Con plan");
    await expect(rows.nth(1).getByTestId("user-row-stage")).toHaveText("Onboarding en pregunta 3 de 18");
    await expect(rows.nth(2)).toContainText("Sin email");
    await expect(rows.nth(2).getByTestId("user-row-stage")).toHaveText("Sin confirmar");
    await expect(page.getByTestId("users-list")).not.toContainText("onboarding_in_progress");
    await expect(page.getByTestId("users-count")).toHaveText("3 usuarias");
    // Una sola cosa focusable por fila.
    await expect(rows.nth(0).locator("a, button")).toHaveCount(1);
  });

  test("filtros en la URL — etapa, búsqueda, ordenar y 'Limpiar'", async ({ page }) => {
    await seedAuthToken(page);
    const requests: URL[] = [];
    await page.route(isUsersList, (route) => {
      requests.push(new URL(route.request().url()));
      return fulfillJson(route, page1([buildUser()]));
    });

    await page.goto(`${BASE_URL}/admin/users?stage=subscribed&search=ana&sort=email&order=asc&page=2`);
    await expect(page.getByTestId("user-row")).toHaveCount(1);

    const first = requests.at(-1);
    expect(first?.searchParams.get("stage")).toBe("subscribed");
    expect(first?.searchParams.get("search")).toBe("ana");
    expect(first?.searchParams.get("sort")).toBe("email");
    expect(first?.searchParams.get("order")).toBe("asc");
    expect(first?.searchParams.get("page")).toBe("2");
    await expect(page.getByTestId("users-search")).toHaveValue("ana");
    await expect(page.getByTestId("users-stage-filter")).toContainText("Con plan");

    await page.getByTestId("users-clear-filters").click();

    await expect(page).toHaveURL(/\/admin\/users\?sort=email&order=asc$/);
    await expect(page.getByTestId("users-search")).toHaveValue("");
    await expect(page.getByTestId("users-clear-filters")).toHaveCount(0);
  });

  test("elegir etapa desde el select actualiza URL y pedido", async ({ page }) => {
    await seedAuthToken(page);
    const requests: URL[] = [];
    await page.route(isUsersList, (route) => {
      requests.push(new URL(route.request().url()));
      return fulfillJson(route, page1([buildUser()]));
    });
    await page.goto(`${BASE_URL}/admin/users`);
    await expect(page.getByTestId("user-row")).toHaveCount(1);

    await page.getByTestId("users-stage-filter").click();
    await page.getByRole("option", { name: "Sin confirmar" }).click();

    await expect(page).toHaveURL(/stage=unconfirmed/);
    await expect.poll(() => requests.at(-1)?.searchParams.get("stage")).toBe("unconfirmed");
  });

  test("sin resultados — mensaje y link 'Limpiar filtros'", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(isUsersList, (route) => {
      const stage = new URL(route.request().url()).searchParams.get("stage");
      return fulfillJson(route, stage ? page1([]) : page1([buildUser()]));
    });
    await page.goto(`${BASE_URL}/admin/users?stage=subscribed`);

    await expect(page.getByTestId("users-no-results")).toContainText("Sin resultados");
    await page.getByTestId("users-no-results-clear").click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByTestId("user-row")).toHaveCount(1);
  });

  test("estado vacío (sin filtros) y error con reintento", async ({ page }) => {
    await seedAuthToken(page);
    let mode: "error" | "empty" = "error";
    await page.route(isUsersList, (route) =>
      mode === "error"
        ? fulfillJson(route, { message: "boom" }, 500)
        : fulfillJson(route, page1([])),
    );
    await page.goto(`${BASE_URL}/admin/users`);

    await expect(page.getByTestId("users-error")).toBeVisible();
    mode = "empty";
    await page.getByTestId("users-error").getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("users-empty")).toContainText("Todavía no hay usuarias");
    await expect(page.getByTestId("users-no-results")).toHaveCount(0);
  });

  test("paginación — Siguiente pide la página 2 y queda en la URL", async ({ page }) => {
    await seedAuthToken(page);
    const requests: URL[] = [];
    await page.route(isUsersList, (route) => {
      const url = new URL(route.request().url());
      requests.push(url);
      return fulfillJson(route, { ...page1([buildUser()], 45, 3), page: Number(url.searchParams.get("page")) });
    });
    await page.goto(`${BASE_URL}/admin/users`);
    await expect(page.getByTestId("users-pagination")).toContainText("Página 1 de 3");

    await page.getByTestId("users-next-page").click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByTestId("users-pagination")).toContainText("Página 2 de 3");
    expect(requests.at(-1)?.searchParams.get("page")).toBe("2");
  });

  test("cuenta sin onboarding — panel con nota, estado de cuenta y sin contenido de chats", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(isUsersList, (route) =>
      fulfillJson(route, page1([buildUser({ userId: "u1", stage: "unconfirmed", accountStatus: "unconfirmed", email: "x@gmail.con" })])),
    );
    await page.route(isUserDetail, (route) =>
      fulfillJson(
        route,
        buildDetail(
          { userId: "u1", email: "x@gmail.con", stage: "unconfirmed", accountStatus: "unconfirmed", provider: "google", onboarding: null },
          ["registered"],
          "confirmed",
        ),
      ),
    );
    await page.goto(`${BASE_URL}/admin/users`);

    await page.getByTestId("user-row").getByRole("link").click();

    const panel = page.getByTestId("user-panel");
    await expect(panel).toContainText("Todavía no completó el onboarding");
    await expect(panel).toContainText("Ingresó con Google");
    await expect(panel).toContainText("Sin confirmar");
    await expect(page.getByTestId("user-panel-typo")).toContainText("¿posible error de tipeo?");
    await expect(page.getByTestId("timeline-confirmed")).toHaveAttribute("data-state", "stopped");
    await expect(panel).not.toContainText("unconfirmed");

    // El botón Cerrar también cierra y conserva los filtros de la lista.
    await page.getByTestId("user-panel-close").click();
    await expect(panel).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test("panel — resumen de suscriptora, carga, 404 y error con reintento", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(isUsersList, (route) => fulfillJson(route, page1([buildUser({ userId: "u1" })])));
    let mode: "ok" | "404" | "500" = "ok";
    await page.route(isUserDetail, async (route) => {
      if (mode === "404") return fulfillJson(route, { message: "Not Found" }, 404);
      if (mode === "500") return fulfillJson(route, { message: "boom" }, 500);
      return fulfillJson(
        route,
        buildDetail(
          {
            stage: "subscribed",
            onboarding: null,
            attentionReason: null,
            summary: {
              conversations: 12,
              cycleReports: 4,
              plan: { planId: "p1", name: "Mensual" },
              subscriptionStatus: "past_due",
              lastPayment: { amountInCents: 4_200_000, paidAt: "2026-09-20T15:00:00.000Z" },
            },
          },
          ["registered", "confirmed", "onboarding_started", "onboarding_completed", "subscription"],
          "first_cycle_report",
        ),
      );
    });

    mode = "500";
    await page.goto(`${BASE_URL}/admin/users?user=u1`);
    await expect(page.getByTestId("user-panel-error")).toBeVisible();
    mode = "ok";
    await page.getByTestId("user-panel-error").getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("summary-plan")).toContainText("Mensual");
    await expect(page.getByTestId("summary-subscription")).toContainText("Pago vencido");
    await expect(page.getByTestId("summary-last-payment")).toContainText("20 sep");
    await expect(page.getByTestId("summary-conversations")).toContainText("12");

    mode = "404";
    await page.goto(`${BASE_URL}/admin/users?user=ghost`);
    await expect(page.getByTestId("user-panel-not-found")).toHaveText("No encontramos a esta usuaria.");
  });

  test("viewport 375 — filas apiladas de dos líneas, panel a pantalla completa, sin overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAuthToken(page);
    await page.route(isUsersList, (route) =>
      fulfillJson(route, page1([buildUser({ userId: "u1", email: "una-direccion-de-correo-extremadamente-larga@example.com", stage: "onboarding_in_progress", onboarding: { currentQuestionIndex: 7, totalQuestions: 18, startedAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z" } })])),
    );
    await page.route(isUserDetail, (route) => fulfillJson(route, buildDetail({ userId: "u1" })));
    await page.goto(`${BASE_URL}/admin/users`);

    const row = page.getByTestId("user-row");
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("2 conv. · 1 reporte");
    const email = await row.getByText("una-direccion", { exact: false }).boundingBox();
    const stage = await row.getByTestId("user-row-stage").boundingBox();
    expect(email && stage).toBeTruthy();
    if (email && stage) expect(stage.y).toBeGreaterThan(email.y);
    await expect(page.getByTestId("users-sort-email")).toBeHidden();
    await expect(page.getByTestId("user-row-stage")).toHaveAttribute(
      "title",
      "Onboarding en pregunta 7 de 18",
    );
    await expectNoHorizontalOverflow(page, 375);

    await row.getByRole("link").click();
    const panel = page.getByTestId("user-panel");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(374);
    await expect(page.getByTestId("user-panel-timeline")).toBeVisible();
    await expectNoHorizontalOverflow(page, 375);
  });

  test("filas apiladas — pluraliza reportes (0, 1, N)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAuthToken(page);
    await page.route(isUsersList, (route) =>
      fulfillJson(
        route,
        page1([
          buildUser({ userId: "a", conversations: 1, cycleReports: 0 }),
          buildUser({ userId: "b", conversations: 1, cycleReports: 1 }),
          buildUser({ userId: "c", conversations: 1, cycleReports: 3 }),
        ]),
      ),
    );
    await page.goto(`${BASE_URL}/admin/users`);
    const rows = page.getByTestId("user-row");
    await expect(rows.nth(0)).toContainText("1 conv. · 0 reportes");
    await expect(rows.nth(1)).toContainText("1 conv. · 1 reporte");
    await expect(rows.nth(1)).not.toContainText("1 reportes");
    await expect(rows.nth(2)).toContainText("1 conv. · 3 reportes");
  });

  test("panel — primer render muestra el skeleton, no un panel vacío", async ({ page }) => {
    await seedAuthToken(page);
    await page.route(isUsersList, (route) => fulfillJson(route, page1([buildUser({ userId: "u1" })])));
    await page.route(isUserDetail, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return fulfillJson(route, buildDetail({ userId: "u1" }));
    });
    await page.goto(`${BASE_URL}/admin/users?user=u1`);
    await expect(page.getByTestId("user-panel-loading")).toBeVisible();
    await expect(page.getByTestId("user-panel-not-found")).toHaveCount(0);
    await expect(page.getByTestId("user-panel-timeline")).toBeVisible();
  });

  test("viewport 768 — lista apilada con rail y detalle a pantalla completa", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await seedAuthToken(page);
    await page.route(isUsersList, (route) => fulfillJson(route, page1([buildUser({ userId: "u1" })])));
    await page.route(isUserDetail, (route) => fulfillJson(route, buildDetail({ userId: "u1" })));
    await page.goto(`${BASE_URL}/admin/users`);

    await expect(page.getByTestId("user-row")).toHaveCount(1);
    await expect(page.getByTestId("users-sort-email")).toBeHidden();
    await expectNoHorizontalOverflow(page, 768);

    await page.getByTestId("user-row").getByRole("link").click();
    const box = await page.getByTestId("user-panel").boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(767);
  });

  test("viewport 1440 — columnas completas, ordenar por columna y panel lateral de 440px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedAuthToken(page);
    const requests: URL[] = [];
    await page.route(isUsersList, (route) => {
      requests.push(new URL(route.request().url()));
      return fulfillJson(route, page1([buildUser({ userId: "u1" })]));
    });
    await page.route(isUserDetail, (route) => fulfillJson(route, buildDetail({ userId: "u1" })));
    await page.goto(`${BASE_URL}/admin/users`);

    await expect(page.getByTestId("users-sort-createdAt")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /Registrada/ }),
    ).toHaveAttribute("aria-sort", "descending");
    await page.getByTestId("users-sort-conversations").click();
    await expect(page).toHaveURL(/sort=conversations/);
    expect(requests.at(-1)?.searchParams.get("sort")).toBe("conversations");
    expect(requests.at(-1)?.searchParams.get("order")).toBe("desc");

    await page.getByTestId("user-row").getByRole("link").click();
    const box = await page.getByTestId("user-panel").boundingBox();
    expect(box?.width).toBe(440);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBe(1440);
    await expectNoHorizontalOverflow(page, 1440);
  });
});
