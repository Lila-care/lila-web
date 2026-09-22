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

// Stateful mock for the 3 endpoints this feature consumes — mutates in-memory arrays so a
// create/update in one request is visible to the refetch the hooks trigger right after.
function mockPlansApi(
  page: Page,
  initial: {
    plans?: PlanFixture[];
    discounts?: DiscountFixture[];
    subscribers?: SubscriberFixture[];
  } = {},
) {
  const plans = [...(initial.plans ?? [])];
  const discounts = [...(initial.discounts ?? [])];
  const subscribers = initial.subscribers ?? [];
  let planSeq = plans.length;
  let discountSeq = discounts.length;

  return page.route(`${API_URL}/admin/subscription/**`, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === "/admin/subscription/plans" && method === "GET") {
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
      const planId = planMatch[1];
      const body = route.request().postDataJSON();
      const idx = plans.findIndex((p) => p.planId === planId);
      if (idx === -1) return fulfillJson(route, { message: "not found" }, 404);
      plans[idx] = { ...plans[idx], ...body };
      return fulfillJson(route, plans[idx]);
    }

    if (path === "/admin/subscription/discounts" && method === "GET") {
      const status = url.searchParams.get("status");
      const filtered = status
        ? discounts.filter((d) => d.status === status)
        : discounts;
      return fulfillJson(route, filtered);
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
      const discountId = discountMatch[1];
      const body = route.request().postDataJSON();
      const idx = discounts.findIndex((d) => d.discountId === discountId);
      if (idx === -1) return fulfillJson(route, { message: "not found" }, 404);
      discounts[idx] = { ...discounts[idx], ...body };
      return fulfillJson(route, discounts[idx]);
    }

    if (path === "/admin/subscription/subscribers" && method === "GET") {
      return fulfillJson(route, { items: subscribers, nextCursor: null });
    }

    return route.continue();
  });
}

async function assertNoHorizontalOverflow(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x + box.width).toBeLessThanOrEqual(375 + 1);
  }
}

test.describe("Admin Plans", () => {
  test("empty state → crear plan → aparece en la tabla", async ({ page }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, { plans: [], discounts: [], subscribers: [] });

    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("plans-empty")).toBeVisible();
    await expect(page.getByTestId("plans-empty")).toContainText("Crear plan");

    await page.getByTestId("plans-empty-create").click();
    await expect(page.getByTestId("plan-panel")).toBeVisible();

    await page.getByTestId("plan-name-input").fill("Plan Básico");
    await page.getByTestId("plan-amount-input").fill("19900");
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    await expect(page.getByTestId("plans-section")).toContainText(
      "Plan Básico",
    );
  });

  test("editar plan — cambia el nombre", async ({ page }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [buildPlan()],
      discounts: [],
      subscribers: [],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plan-edit-plan-1").click();
    await expect(page.getByTestId("plan-panel")).toBeVisible();

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
    await mockPlansApi(page, {
      plans: [buildPlan()],
      discounts: [],
      subscribers: [],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plan-edit-plan-1").click();

    await page.getByTestId("plan-status-toggle").click();
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-save-button")).toHaveText(
      "¿Confirmar desactivación?",
    );
    // First click only arms the confirmation — the panel must still be open, unsaved.
    await expect(page.getByTestId("plan-panel")).toBeVisible();

    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    await expect(page.getByTestId("plans-section")).toContainText("Inactivo");
  });

  test("crear descuento con código", async ({ page }) => {
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [buildPlan()],
      discounts: [],
      subscribers: [],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-discounts").click();
    await expect(page.getByTestId("discounts-empty")).toBeVisible();

    await page.getByTestId("discounts-empty-create").click();
    await expect(page.getByTestId("discount-panel")).toBeVisible();

    await page.getByTestId("discount-kind-custom").click();
    await page.getByTestId("discount-plan-select").selectOption("plan-1");
    await page.getByTestId("discount-code-input").fill("bienvenida10");
    await page
      .getByTestId("discount-value-type-select")
      .selectOption("percentage");
    await page.getByTestId("discount-value-input").fill("10");
    await page.getByTestId("discount-starts-at-input").fill("2026-01-01");
    await page.getByTestId("discount-ends-at-input").fill("2026-12-31");
    await page.getByTestId("discount-save-button").click();

    await expect(page.getByTestId("discount-panel")).toHaveCount(0);
    await expect(page.getByTestId("discounts-section")).toContainText(
      "BIENVENIDA10",
    );
  });

  test("plan con descuento estático activo muestra precio tachado + precio final", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const plan = buildPlan({
      planId: "plan-promo",
      name: "Plan Promo",
      amountInCents: 2_990_000,
    });
    const discount: DiscountFixture = {
      discountId: "discount-promo",
      planId: "plan-promo",
      kind: "static",
      code: "AUTO-xyz",
      valueType: "percentage",
      value: 20,
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2099-12-31T23:59:59.999Z",
      status: "active",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    };
    await mockPlansApi(page, {
      plans: [plan],
      discounts: [discount],
      subscribers: [],
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
    await expect(priceCell).toContainText(expectedOriginal);
    await expect(priceCell).toContainText(expectedFinal);
    await expect(priceCell.locator(".line-through")).toContainText(
      expectedOriginal,
    );
  });

  test("tab Suscriptoras es de solo lectura — sin botones de crear/editar", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const subscriber: SubscriberFixture = {
      userId: "user-1",
      email: "usuaria@example.com",
      planName: "Plan Mensual",
      status: "active",
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
      source: "paid",
    };
    await mockPlansApi(page, {
      plans: [buildPlan()],
      discounts: [],
      subscribers: [subscriber],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("tab-subscribers").click();

    await expect(page.getByTestId("subscribers-section")).toContainText(
      "usuaria@example.com",
    );
    await expect(
      page
        .getByTestId("subscribers-section")
        .getByRole("button", { name: /crear|editar/i }),
    ).toHaveCount(0);
  });

  test("viewport 375px — sin overflow horizontal en las 3 tabs", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await seedAuthToken(page);
    await mockPlansApi(page, {
      plans: [
        buildPlan({
          name: "Plan con nombre bastante largo para forzar overflow",
        }),
      ],
      discounts: [],
      subscribers: [],
    });

    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("plans-section")).toBeVisible();
    await assertNoHorizontalOverflow(page, "plans-section");

    await page.getByTestId("tab-discounts").click();
    await assertNoHorizontalOverflow(page, "discounts-section");

    await page.getByTestId("tab-subscribers").click();
    await assertNoHorizontalOverflow(page, "subscribers-section");
  });
});
