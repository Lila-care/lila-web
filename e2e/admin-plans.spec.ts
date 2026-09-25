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

interface PlanFixture {
  planId: string;
  name: string;
  amountInCents: number;
  currency: "COP";
  intervalDays: number | null;
  status: "active" | "inactive";
  description?: string;
  maxInteractionsPerDay: number | null;
}

interface DiscountFixture {
  discountId: string;
  planId: string;
  kind: "static" | "custom";
  code: string;
  valueType: "fixed" | "percentage";
  value: number;
  startsAt: string;
  endsAt: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

interface SubscriberFixture {
  userId: string;
  email?: string;
  planName: string;
  status: "none" | "active" | "past_due" | "canceled";
  currentPeriodEnd: string | null;
  source: "paid" | "admin_trial";
}

function buildPlan(overrides: Partial<PlanFixture> = {}): PlanFixture {
  return {
    planId: "plan-1",
    name: "Plan Mensual",
    amountInCents: 2_990_000,
    currency: "COP",
    intervalDays: 30,
    status: "active",
    maxInteractionsPerDay: 20,
    ...overrides,
  };
}

function buildDiscount(
  overrides: Partial<DiscountFixture> = {},
): DiscountFixture {
  return {
    discountId: "discount-1",
    planId: "plan-1",
    kind: "custom",
    code: "LILA20",
    valueType: "percentage",
    value: 20,
    startsAt: "2020-01-01T00:00:00-05:00",
    endsAt: "2099-12-31T23:59:59.999-05:00",
    status: "active",
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildSubscriber(
  overrides: Partial<SubscriberFixture> = {},
): SubscriberFixture {
  return {
    userId: "user-1",
    email: "usuaria@example.com",
    planName: "Plan Mensual",
    status: "active",
    currentPeriodEnd: "2026-10-18T12:00:00.000Z",
    source: "paid",
    ...overrides,
  };
}

interface MockOptions {
  plans?: PlanFixture[];
  discounts?: DiscountFixture[];
  // One array per cursor page; page N+1 is served for `?cursor=page-N`.
  subscriberPages?: SubscriberFixture[][];
  failPlans?: boolean;
}

// Stateful mock for the 3 endpoints this feature consumes — mutates in-memory arrays so a
// create/update in one request is visible to the refetch the hooks trigger right after.
function mockPlansApi(page: Page, initial: MockOptions = {}) {
  const plans = [...(initial.plans ?? [])];
  const discounts = [...(initial.discounts ?? [])];
  const subscriberPages = initial.subscriberPages ?? [[]];
  const requests = {
    subscribers: 0,
    // Every mutating request, in order — tests assert the exact payload the UI sent.
    mutations: [] as { method: string; path: string; body: unknown }[],
  };
  let planSeq = plans.length;
  let discountSeq = discounts.length;

  const handler = async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;
    if (method === "POST" || method === "PATCH") {
      requests.mutations.push({
        method,
        path,
        body: route.request().postDataJSON(),
      });
    }

    if (path === "/admin/subscription/plans" && method === "GET") {
      if (initial.failPlans) {
        return fulfillJson(route, { message: "boom" }, 500);
      }
      return fulfillJson(route, plans);
    }
    if (path === "/admin/subscription/plans" && method === "POST") {
      const body = route.request().postDataJSON();
      planSeq += 1;
      const created: PlanFixture = {
        planId: `plan-${planSeq}`,
        name: body.name,
        amountInCents: body.amountInCents,
        currency: "COP",
        intervalDays: body.intervalDays ?? null,
        status: "active",
        description: body.description,
        maxInteractionsPerDay: body.maxInteractionsPerDay ?? null,
      };
      plans.push(created);
      return fulfillJson(route, created, 201);
    }
    const planMatch = path.match(/^\/admin\/subscription\/plans\/(.+)$/);
    if (planMatch && method === "PATCH") {
      const idx = plans.findIndex((p) => p.planId === planMatch[1]);
      if (idx === -1) return fulfillJson(route, { message: "not found" }, 404);
      plans[idx] = { ...plans[idx], ...route.request().postDataJSON() };
      return fulfillJson(route, plans[idx]);
    }

    if (path === "/admin/subscription/discounts" && method === "GET") {
      const status = url.searchParams.get("status");
      return fulfillJson(
        route,
        status ? discounts.filter((d) => d.status === status) : discounts,
      );
    }
    if (path === "/admin/subscription/discounts" && method === "POST") {
      const body = route.request().postDataJSON();
      discountSeq += 1;
      const now = new Date().toISOString();
      const created: DiscountFixture = {
        discountId: `discount-${discountSeq}`,
        planId: body.planId,
        kind: body.kind,
        code: body.kind === "custom" ? body.code : `AUTO-${discountSeq}`,
        valueType: body.valueType,
        value: body.value,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      discounts.push(created);
      return fulfillJson(route, created, 201);
    }
    const discountMatch = path.match(
      /^\/admin\/subscription\/discounts\/(.+)$/,
    );
    if (discountMatch && method === "PATCH") {
      const idx = discounts.findIndex((d) => d.discountId === discountMatch[1]);
      if (idx === -1) return fulfillJson(route, { message: "not found" }, 404);
      discounts[idx] = {
        ...discounts[idx],
        ...route.request().postDataJSON(),
      };
      return fulfillJson(route, discounts[idx]);
    }

    if (path === "/admin/subscription/subscribers" && method === "GET") {
      requests.subscribers += 1;
      const cursor = url.searchParams.get("cursor");
      const index = cursor ? Number(cursor.replace("page-", "")) + 1 : 0;
      const hasNext = index < subscriberPages.length - 1;
      return fulfillJson(route, {
        items: subscriberPages[index] ?? [],
        nextCursor: hasNext ? `page-${index}` : null,
      });
    }

    return route.continue();
  };

  return page
    .route(`${API_URL}/admin/subscription/**`, handler)
    .then(() => requests);
}

async function expectNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(375);
}

test.describe("Admin Plans — Planes", () => {
  test("empty state → crear plan → aparece en el ledger y el contador", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page);

    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(
      page.getByRole("heading", { name: "Gestión de Planes" }),
    ).toBeVisible();
    const empty = page.getByTestId("plans-empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("Todavía no hay planes creados");
    await expect(empty).toContainText(
      "Creá el primer plan para empezar a ofrecer suscripciones.",
    );
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "0 planes",
    );

    await page.getByTestId("plans-empty-create").click();
    const panel = page.getByTestId("plan-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("role", "dialog");
    await expect(
      page.getByRole("dialog", { name: "Nuevo plan" }),
    ).toBeVisible();
    // Foco inicial en el primer campo.
    await expect(page.getByTestId("plan-name-input")).toBeFocused();

    await page.getByTestId("plan-name-input").fill("Plan Básico");
    await page.getByTestId("plan-amount-input").fill("19900");
    await page.getByTestId("plan-max-interactions-input").fill("5");
    await page.getByTestId("plan-save-button").click();

    await expect(panel).toHaveCount(0);
    const row = page.getByTestId("plan-row-plan-1");
    await expect(row).toContainText("Plan Básico");
    await expect(row).toContainText("Sin ciclo de cobro");
    await expect(row).toContainText("5 mensajes / día");
    await expect(row).toContainText("Activo");
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "1 plan · 1 activo",
    );
  });

  test("editar plan — cambia el nombre desde el link Editar", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plan-edit-plan-1").click();
    await expect(
      page.getByRole("dialog", { name: "Editar plan" }),
    ).toBeVisible();
    await expect(page.getByTestId("plan-name-input")).toHaveValue(
      "Plan Mensual",
    );

    await page.getByTestId("plan-name-input").fill("Plan Mensual Plus");
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    await expect(page.getByTestId("plans-section")).toContainText(
      "Plan Mensual Plus",
    );
  });

  test("desactivar un plan requiere confirmación de 2 pasos", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plan-edit-plan-1").click();

    await page.getByTestId("plan-status-toggle").click();
    await expect(page.getByTestId("plan-status-value")).toContainText(
      "Inactivo",
    );
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-save-button")).toHaveText(
      "¿Confirmar desactivación?",
    );
    await expect(page.getByTestId("plan-deactivate-warning")).toBeVisible();
    // El primer click solo arma la confirmación — el panel sigue abierto, sin guardar.
    await expect(page.getByTestId("plan-panel")).toBeVisible();

    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    await expect(page.getByTestId("plan-row-plan-1")).toContainText("Inactivo");
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "1 plan · 0 activos",
    );
  });

  test("plan con descuento automático activo — precio tachado, final y detalle", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [
        buildPlan({
          planId: "plan-promo",
          name: "Plan Promo",
          amountInCents: 2_990_000,
        }),
      ],
      discounts: [
        buildDiscount({
          discountId: "discount-promo",
          planId: "plan-promo",
          kind: "static",
          code: "AUTO-xyz",
        }),
      ],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    const priceCell = page.getByTestId("plan-price-promo-plan-promo");
    await expect(priceCell).toBeVisible();

    const [expectedOriginal, expectedFinal] = await page.evaluate(() => {
      const fmt = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      });
      return [fmt.format(29_900), fmt.format(29_900 - 5_980)];
    });
    await expect(priceCell.locator(".line-through")).toHaveText(
      expectedOriginal,
    );
    await expect(priceCell).toContainText(expectedFinal);
    // El id interno AUTO-xxx nunca se muestra; la vigencia se lee en UTC.
    await expect(priceCell).toContainText("Automático · -20% · termina 31/12");
    await expect(priceCell).not.toContainText("AUTO-xyz");
  });

  test("error al cargar planes — mensaje + reintentar", async ({ page }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { failPlans: true });

    await page.goto(`${BASE_URL}/admin/plans`);
    const error = page.getByTestId("plans-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("No pudimos cargar los planes.");
    // Never the raw BE body ("boom").
    await expect(error).toContainText("Intentá de nuevo en unos segundos.");
    await expect(error).not.toContainText("boom");
    await expect(
      error.getByRole("button", { name: "Reintentar" }),
    ).toBeVisible();
  });

  test("panel lateral — Escape y click en el scrim cierran y el foco vuelve al disparador", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    const trigger = page.getByTestId("plans-create-button");
    await trigger.click();
    await expect(page.getByTestId("plan-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page
      .getByTestId("plan-panel-scrim")
      .click({ position: { x: 10, y: 10 } });
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);

    // Panel de 420px sobre la superficie de card; la página no se pinta de blanco.
    await trigger.click();
    const box = await page.getByTestId("plan-panel").boundingBox();
    expect(box?.width).toBe(420);
    await expect(page.getByTestId("plan-panel")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)",
    );
    await expect(page.getByTestId("plans-page")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
  });
});

test.describe("Admin Plans — Descuentos", () => {
  test("crear descuento con código — payload con vigencia en hora de Bogotá", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const requests = await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await expect(page.getByTestId("discounts-empty")).toContainText(
      "Todavía no hay descuentos creados",
    );
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "0 descuentos",
    );

    await page.getByTestId("discounts-empty-create").click();
    await expect(
      page.getByRole("dialog", { name: "Nuevo descuento" }),
    ).toBeVisible();

    await page.getByTestId("discount-kind-custom").click();
    await expect(page.getByTestId("discount-kind-custom")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("discount-plan-select").selectOption("plan-1");
    await page.getByTestId("discount-code-input").fill("bienvenida10");
    await page
      .getByTestId("discount-value-type-select")
      .selectOption("percentage");
    await page.getByTestId("discount-value-input").fill("10");
    await page.getByTestId("discount-starts-at-input").fill("2026-01-01");
    await page.getByTestId("discount-ends-at-input").fill("2099-12-31");
    await page.getByTestId("discount-save-button").click();

    await expect(page.getByTestId("discount-panel")).toHaveCount(0);
    const row = page.getByTestId("discount-row-discount-1");
    await expect(row).toContainText("BIENVENIDA10");
    await expect(row).toContainText("-10%");
    await expect(row).toContainText("01/01 → 31/12");
    await expect(row).toContainText("Plan Mensual");
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "1 descuento · 1 vigente",
    );
    expect(requests.mutations).toEqual([
      {
        method: "POST",
        path: "/admin/subscription/discounts",
        body: {
          planId: "plan-1",
          kind: "custom",
          code: "BIENVENIDA10",
          valueType: "percentage",
          value: 10,
          startsAt: "2026-01-01T00:00:00-05:00",
          endsAt: "2099-12-31T23:59:59.999-05:00",
        },
      },
    ]);
  });

  test("vigencia inválida — fin antes que inicio muestra error y no guarda", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await page.getByTestId("discounts-create-button").click();
    await page.getByTestId("discount-plan-select").selectOption("plan-1");
    await page.getByTestId("discount-value-input").fill("15");
    await page.getByTestId("discount-starts-at-input").fill("2026-09-28");
    await page.getByTestId("discount-ends-at-input").fill("2026-09-21");
    // `min` on the end date would block native submit; remove it to reach our own check.
    await page
      .getByTestId("discount-ends-at-input")
      .evaluate((el) => el.removeAttribute("min"));
    await page.getByTestId("discount-save-button").click();

    await expect(page.getByTestId("discount-save-error")).toHaveText(
      "La fecha de fin no puede ser anterior a la de inicio.",
    );
    await expect(page.getByTestId("discount-panel")).toBeVisible();
  });

  test("editar descuento — plan y código quedan bloqueados", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [buildPlan()],
      discounts: [buildDiscount()],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await page.getByTestId("discount-edit-discount-1").click();

    await expect(page.getByTestId("discount-plan-readonly")).toBeDisabled();
    await expect(page.getByTestId("discount-plan-readonly")).toHaveValue(
      "Plan Mensual",
    );
    await expect(page.getByTestId("discount-code-input")).toBeDisabled();
    await expect(page.getByTestId("discount-kind-static")).toBeDisabled();

    await page.getByTestId("discount-value-input").fill("25");
    await page.getByTestId("discount-save-button").click();
    await expect(page.getByTestId("discount-panel")).toHaveCount(0);
    await expect(page.getByTestId("discount-row-discount-1")).toContainText(
      "-25%",
    );
  });
});

test.describe("Admin Plans — Suscriptoras", () => {
  test("solo lectura, estados/origen y paginación con Cargar más", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const requests = await mockPlansApi(page, {
      plans: [buildPlan()],
      subscriberPages: [
        [
          buildSubscriber(),
          buildSubscriber({
            userId: "user-2",
            email: "cortesia@example.com",
            status: "past_due",
            source: "admin_trial",
          }),
        ],
        [
          buildSubscriber({
            userId: "user-3",
            email: "segunda@example.com",
            status: "canceled",
            currentPeriodEnd: null,
          }),
        ],
      ],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("plans-section")).toBeVisible();
    // La lista de suscriptoras no se pide hasta abrir su tab.
    expect(requests.subscribers).toBe(0);

    await page.getByTestId("tab-subscribers").click();
    const section = page.getByTestId("subscribers-section");
    await expect(page.getByTestId("subscriber-row-user-1")).toContainText(
      "usuaria@example.com",
    );
    await expect(page.getByTestId("subscriber-row-user-1")).toContainText(
      "18 oct 2026",
    );
    await expect(page.getByTestId("subscriber-row-user-2")).toContainText(
      "Pago vencido",
    );
    await expect(page.getByTestId("subscriber-row-user-2")).toContainText(
      "Cortesía admin",
    );
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "2+ suscriptoras",
    );
    await expect(
      section.getByRole("button", { name: /crear|editar/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /crear/i })).toHaveCount(0);

    await page.getByTestId("subscribers-load-more").click();
    await expect(page.getByTestId("subscriber-row-user-3")).toContainText(
      "Cancelada",
    );
    await expect(page.getByTestId("subscribers-load-more")).toHaveCount(0);
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "3 suscriptoras",
    );
  });

  test("estado vacío", async ({ page }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-subscribers").click();
    await expect(page.getByTestId("subscribers-empty")).toContainText(
      "Todavía no hay suscriptoras",
    );
  });
});

test.describe("Admin Plans — navegación y responsive", () => {
  test("tabs accesibles — aria-selected y flechas del teclado", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("nav-item-plans")).toHaveAttribute(
      "aria-current",
      "page",
    );
    const plansTab = page.getByRole("tab", { name: "Planes" });
    await expect(plansTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      (await plansTab.getAttribute("id")) ?? "",
    );

    await plansTab.focus();
    await page.keyboard.press("ArrowRight");
    const discountsTab = page.getByRole("tab", { name: "Descuentos" });
    await expect(discountsTab).toBeFocused();
    await expect(discountsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("discounts-section")).toBeVisible();
  });

  test("viewport 375 — tab bar con Planes, filas apiladas y sin scroll horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [
        buildPlan({
          name: "Plan con nombre bastante largo para forzar overflow en móvil",
        }),
        buildPlan({
          planId: "plan-free",
          name: "Gratis",
          amountInCents: 0,
          intervalDays: null,
          maxInteractionsPerDay: 5,
        }),
      ],
      discounts: [buildDiscount()],
      subscriberPages: [[buildSubscriber()]],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    const tabBar = page.getByTestId("admin-tab-bar");
    await expect(tabBar).toBeVisible();
    await expect(tabBar.getByTestId("tab-item-plans")).toContainText("Planes");
    await expect(tabBar.getByTestId("tab-item-plans")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(tabBar.getByRole("link")).toHaveCount(6); // Dashboard, Usuarias, Reportes, Formularios, Planes, Contenido

    // Crear plan pasa debajo de las tabs, a todo el ancho.
    await expect(page.getByTestId("plans-create-button")).toBeHidden();
    await expect(page.getByTestId("plans-create-button-mobile")).toBeVisible();

    // Fila apilada con resumen; sin headers de columna.
    const freeRow = page.getByTestId("plan-row-plan-free-open");
    await expect(freeRow).toBeVisible();
    await expect(freeRow).toContainText("Sin ciclo · 5 msj/día");
    await expect(page.getByTestId("plan-edit-plan-free")).toBeHidden();
    await expectNoHorizontalScroll(page);

    // Tocar la fila apilada abre el panel de edición a todo el ancho.
    await freeRow.click();
    const panelBox = await page.getByTestId("plan-panel").boundingBox();
    expect(panelBox?.width).toBe(375);
    await page.getByTestId("plan-panel-close").click();

    await page.getByTestId("tab-discounts").click();
    await expect(
      page.getByTestId("discount-row-discount-1-open"),
    ).toContainText("LILA20 · -20% · 01/01 → 31/12");
    await expectNoHorizontalScroll(page);

    await page.getByTestId("tab-subscribers").click();
    await expect(
      page.getByTestId("subscriber-row-user-1").locator("div").first(),
    ).toContainText("Plan Mensual · Vence 18 oct 2026 · Pago");
    await expectNoHorizontalScroll(page);
  });
});

test.describe("Admin Plans — payloads, foco y errores del BE", () => {
  test("descuento fijo — 5.000 COP viaja como 500000 centavos y la edición muestra 5000", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const requests = await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await page.getByTestId("discounts-create-button").click();
    await page.getByTestId("discount-plan-select").selectOption("plan-1");
    await page.getByTestId("discount-value-type-select").selectOption("fixed");
    await page.getByTestId("discount-value-input").fill("5000");
    await page.getByTestId("discount-starts-at-input").fill("2026-09-21");
    await page.getByTestId("discount-ends-at-input").fill("2026-09-28");
    await page.getByTestId("discount-save-button").click();

    await expect(page.getByTestId("discount-panel")).toHaveCount(0);
    expect(requests.mutations[0].body).toMatchObject({
      kind: "static",
      valueType: "fixed",
      value: 500_000,
      startsAt: "2026-09-21T00:00:00-05:00",
      endsAt: "2026-09-28T23:59:59.999-05:00",
    });
    const row = page.getByTestId("discount-row-discount-1");
    await expect(row).toContainText("Automático");
    await expect(row).toContainText("21/09 → 28/09");

    await page.getByTestId("discount-edit-discount-1").click();
    await expect(page.getByTestId("discount-value-input")).toHaveValue("5000");
    await expect(page.getByTestId("discount-starts-at-input")).toHaveValue(
      "2026-09-21",
    );
    await expect(page.getByTestId("discount-ends-at-input")).toHaveValue(
      "2026-09-28",
    );
  });

  test("editar descuento — el PATCH solo lleva el campo cambiado; sin cambios no hay request", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const requests = await mockPlansApi(page, {
      plans: [buildPlan()],
      discounts: [buildDiscount()],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();

    await page.getByTestId("discount-edit-discount-1").click();
    await page.getByTestId("discount-save-button").click();
    await expect(page.getByTestId("discount-panel")).toHaveCount(0);
    expect(requests.mutations).toHaveLength(0);

    await page.getByTestId("discount-edit-discount-1").click();
    await page.getByTestId("discount-ends-at-input").fill("2099-06-30");
    await page.getByTestId("discount-save-button").click();
    await expect(page.getByTestId("discount-panel")).toHaveCount(0);
    expect(requests.mutations).toEqual([
      {
        method: "PATCH",
        path: "/admin/subscription/discounts/discount-1",
        body: { endsAt: "2099-06-30T23:59:59.999-05:00" },
      },
    ]);
  });

  test('editar plan — vaciar la descripción envía ""', async ({ page }) => {
    await seedAuthToken(page);
    const requests = await mockPlansApi(page, {
      plans: [buildPlan({ description: "Acceso completo" })],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plan-edit-plan-1").click();
    await expect(page.getByTestId("plan-description-input")).toHaveValue(
      "Acceso completo",
    );
    await page.getByTestId("plan-description-input").fill("");
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(requests.mutations[0]).toMatchObject({
      method: "PATCH",
      path: "/admin/subscription/plans/plan-1",
      body: { description: "" },
    });
  });

  test("tras guardar, el foco vuelve al Editar de la fila", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plan-edit-plan-1").click();
    await page.getByTestId("plan-name-input").fill("Plan Mensual Plus");
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    await expect(page.getByTestId("plan-row-plan-1")).toContainText(
      "Plan Mensual Plus",
    );
    await expect(page.getByTestId("plan-edit-plan-1")).toBeFocused();
  });

  test("crear desde el estado vacío — el foco cae en el título de la página", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page);

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plans-empty-create").click();
    await page.getByTestId("plan-name-input").fill("Plan Básico");
    await page.getByTestId("plan-amount-input").fill("19900");
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-row-plan-1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gestión de Planes" }),
    ).toBeFocused();
  });

  test("error del BE al guardar — se muestra en español, nunca el texto crudo", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });
    // Registered after the stateful mock, so it wins for this one endpoint.
    await page.route(`${API_URL}/admin/subscription/discounts`, (route) =>
      route.request().method() === "POST"
        ? fulfillJson(
            route,
            {
              statusCode: 409,
              message:
                "Another active static discount overlaps this plan and period",
              error: "Conflict",
            },
            409,
          )
        : route.fallback(),
    );

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await page.getByTestId("discounts-create-button").click();
    await page.getByTestId("discount-plan-select").selectOption("plan-1");
    await page.getByTestId("discount-value-input").fill("20");
    await page.getByTestId("discount-starts-at-input").fill("2026-09-21");
    await page.getByTestId("discount-ends-at-input").fill("2026-09-28");
    await page.getByTestId("discount-save-button").click();

    const error = page.getByTestId("discount-save-error");
    await expect(error).toHaveText(
      "Ya hay un descuento automático vigente para ese plan en esas fechas.",
    );
    await expect(error).not.toContainText("overlaps");
    await expect(page.getByTestId("discount-panel")).toBeVisible();
  });

  test("error de validación en array (Nest ValidationPipe) — copy en español", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [buildPlan()] });
    await page.route(`${API_URL}/admin/subscription/discounts`, (route) =>
      route.request().method() === "POST"
        ? fulfillJson(
            route,
            {
              statusCode: 400,
              message: ["code must match ^[A-Za-z0-9_-]{3,32}$"],
              error: "Bad Request",
            },
            400,
          )
        : route.fallback(),
    );

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await page.getByTestId("discounts-create-button").click();
    await page.getByTestId("discount-kind-custom").click();
    await page.getByTestId("discount-plan-select").selectOption("plan-1");
    await page.getByTestId("discount-code-input").fill("LILA20");
    await page.getByTestId("discount-value-input").fill("20");
    await page.getByTestId("discount-starts-at-input").fill("2026-09-21");
    await page.getByTestId("discount-ends-at-input").fill("2026-09-28");
    await page.getByTestId("discount-save-button").click();

    await expect(page.getByTestId("discount-save-error")).toHaveText(
      "El código debe tener entre 3 y 32 caracteres: letras, números, guion o guion bajo.",
    );
  });

  test("Cargar más fallido — conserva las filas y reintenta con el mismo cursor", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [buildPlan()],
      subscriberPages: [
        [buildSubscriber()],
        [buildSubscriber({ userId: "user-2", email: "segunda@example.com" })],
      ],
    });
    const cursorsRequested: (string | null)[] = [];
    let failNext = true;
    await page.route(`${API_URL}/admin/subscription/subscribers*`, (route) => {
      const cursor = new URL(route.request().url()).searchParams.get("cursor");
      if (cursor) cursorsRequested.push(cursor);
      if (cursor && failNext) {
        failNext = false;
        return fulfillJson(route, { message: "Internal server error" }, 500);
      }
      return route.fallback();
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-subscribers").click();
    await expect(page.getByTestId("subscriber-row-user-1")).toBeVisible();

    await page.getByTestId("subscribers-load-more").click();
    const loadMoreError = page.getByTestId("subscribers-load-more-error");
    await expect(loadMoreError).toContainText(
      "No pudimos cargar más suscriptoras.",
    );
    await expect(page.getByTestId("subscriber-row-user-1")).toBeVisible();
    await expect(page.getByTestId("subscribers-error")).toHaveCount(0);

    await page.getByTestId("subscribers-load-more-retry").click();
    await expect(page.getByTestId("subscriber-row-user-2")).toBeVisible();
    await expect(page.getByTestId("subscriber-row-user-1")).toBeVisible();
    expect(cursorsRequested).toEqual(["page-0", "page-0"]);
  });
});
