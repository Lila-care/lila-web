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

// Mirrors how Login/AuthCallback persist the session — must run via an initial navigation so
// localStorage exists for the origin before ProtectedRoute/AuthContext reads it.
function fakeIdToken(sub: string): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: `${sub}@lila.app`,
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

async function seedAuthToken(page: Page, sub: string) {
  await page.goto(BASE_URL);
  await page.evaluate(
    (t) => localStorage.setItem("lila_id_token", t),
    fakeIdToken(sub),
  );
}

// Fakes the Wompi Widget Checkout script (`https://checkout.wompi.co/widget.js`) — real
// sandbox/production keys don't exist yet (see src/Chat/useWompiCheckout.ts), so this stands
// in for the actual widget just enough to exercise our own integration code: constructing
// `WidgetCheckout` with our config and immediately resolving `.open()` with a fake transaction.
async function mockWompiWidget(page: Page) {
  await page.route("https://checkout.wompi.co/widget.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        window.WidgetCheckout = function (config) {
          window.__lastWompiConfig = config;
          this.open = function (callback) {
            callback({
              transaction: {
                id: "txn-e2e-1",
                status: "APPROVED",
                paymentSourceId: "src-e2e-1",
              },
            });
          };
        };
      `,
    }),
  );
}

const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 10 };

const ACTIVE_PLAN = {
  planId: "plan-e2e-1",
  name: "Premium Mensual",
  amountInCents: 1_990_000,
  currency: "COP",
  intervalDays: 30,
  status: "active",
  description: "Acceso ilimitado a Lila",
};

test.describe("Checkout de usuaria — gate de upgrade dispara Wompi + POST /subscription/checkout", () => {
  test("happy path — llegar al límite abre el gate, pagar con Wompi crea la suscripción y cierra el modal", async ({
    page,
  }) => {
    await mockWompiWidget(page);

    let checkoutBody: Record<string, unknown> | null = null;

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, {
        userId: "sub-user",
        templateVersion: 1,
        isGuest: false,
        hasActiveTemplate: true,
        freeQuestionLimit: 3,
        onboarding: { pending: false },
        dailyQuestionCount: 3,
        hasActiveSubscription: false,
      }),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    // Public endpoint (no auth) — `useActivePlan` resolves the checkout `planId` from here.
    await page.route(`${API_URL}/subscription/plans`, (route) =>
      fulfillJson(route, [ACTIVE_PLAN]),
    );
    await page.route(`${API_URL}/subscription/checkout`, async (route) => {
      checkoutBody = route.request().postDataJSON();
      await fulfillJson(
        route,
        {
          subscription: {
            userId: "sub-user",
            status: "active",
            planId: checkoutBody?.planId,
            currentPeriodEnd: "2026-08-19T00:00:00.000Z",
            cancelAtPeriodEnd: false,
            updatedAt: "2026-07-20T00:00:00.000Z",
          },
          payment: {
            transactionId: "txn-e2e-1",
            userId: "sub-user",
            planId: checkoutBody?.planId,
            amountInCents: 1990000,
            currency: "COP",
            status: "APPROVED",
            type: "INITIAL",
            createdAt: "2026-07-20T00:00:00.000Z",
          },
        },
        201,
      );
    });

    await seedAuthToken(page, "sub-user");
    await page.goto(`${BASE_URL}/chat`);

    // Already at today's server-enforced limit — sending triggers the preemptive gate.
    await page.getByPlaceholder("Escríbeme...").fill("Otra pregunta");
    await page.getByLabel("Enviar").click();

    await expect(page.getByTestId("upgrade-gate-modal")).toBeVisible();
    const checkoutButton = page.getByTestId("upgrade-checkout-button");
    await expect(checkoutButton).toBeEnabled();

    await checkoutButton.click();

    await expect(page.getByTestId("upgrade-gate-modal")).toHaveCount(0);
    expect(checkoutBody).toMatchObject({
      paymentSourceId: "src-e2e-1",
      planId: ACTIVE_PLAN.planId,
    });
  });

  test("sin planes activos (GET /subscription/plans devuelve []) — el botón de checkout queda deshabilitado", async ({
    page,
  }) => {
    await mockWompiWidget(page);

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, {
        userId: "sub-user-2",
        templateVersion: 1,
        isGuest: false,
        hasActiveTemplate: true,
        freeQuestionLimit: 3,
        onboarding: { pending: false },
        dailyQuestionCount: 3,
        hasActiveSubscription: false,
      }),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/subscription/plans`, (route) =>
      fulfillJson(route, []),
    );

    await seedAuthToken(page, "sub-user-2");
    await page.goto(`${BASE_URL}/chat`);
    await page.getByPlaceholder("Escríbeme...").fill("Otra pregunta");
    await page.getByLabel("Enviar").click();

    await expect(page.getByTestId("upgrade-gate-modal")).toBeVisible();
    await expect(page.getByTestId("upgrade-plan-unavailable")).toBeVisible();
    await expect(page.getByTestId("upgrade-checkout-button")).toBeDisabled();
  });
});

const DRAFT_PLAN = {
  planId: "plan-1",
  name: "Premium Mensual",
  amountInCents: 1_990_000,
  currency: "COP",
  intervalDays: 30,
  status: "active",
  description: "Acceso ilimitado a Lila",
};

test.describe("Admin — Planes (CRUD)", () => {
  test("estado vacío — muestra mensaje cuando no hay planes", async ({
    page,
  }) => {
    await seedAuthToken(page, "admin-e2e");
    await page.route(`${API_URL}/admin/subscription/plans`, (route) =>
      fulfillJson(route, []),
    );

    await page.goto(`${BASE_URL}/admin/plans`);

    await expect(page.getByTestId("plans-empty")).toBeVisible();
    await expect(page.getByTestId("plan-row")).toHaveCount(0);
  });

  test("estado de error — muestra mensaje si la API falla", async ({
    page,
  }) => {
    await seedAuthToken(page, "admin-e2e");
    await page.route(`${API_URL}/admin/subscription/plans`, (route) =>
      fulfillJson(route, { message: "Internal error" }, 500),
    );

    await page.goto(`${BASE_URL}/admin/plans`);

    await expect(page.getByTestId("plans-error")).toBeVisible();
  });

  test("happy path — crear un plan y editarlo", async ({ page }) => {
    await seedAuthToken(page, "admin-e2e");

    let plans: (typeof DRAFT_PLAN)[] = [];
    let createBody: Record<string, unknown> | null = null;
    let updateBody: Record<string, unknown> | null = null;

    await page.route(`${API_URL}/admin/subscription/plans`, async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, plans);
        return;
      }
      if (route.request().method() === "POST") {
        createBody = route.request().postDataJSON();
        const created = { ...DRAFT_PLAN, ...createBody };
        plans = [created];
        await fulfillJson(route, created, 201);
        return;
      }
      throw new Error(`Unexpected method ${route.request().method()}`);
    });

    await page.route(
      `${API_URL}/admin/subscription/plans/${DRAFT_PLAN.planId}`,
      async (route) => {
        updateBody = route.request().postDataJSON();
        const updated = { ...plans[0], ...updateBody };
        plans = [updated];
        await fulfillJson(route, updated);
      },
    );

    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("plans-empty")).toBeVisible();

    // --- Create ---
    await page.getByTestId("plans-create-button").click();
    await expect(page.getByTestId("plan-editor")).toBeVisible();

    await page.getByTestId("plan-name").fill("Premium Mensual");
    await page.getByTestId("plan-amount").fill("19900");
    await page.getByTestId("plan-interval").fill("30");
    await page.getByTestId("plan-description").fill("Acceso ilimitado a Lila");
    await page.getByTestId("plan-max-interactions").fill("50");
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-row")).toHaveCount(1);
    await expect(page.getByTestId("plan-status-badge")).toHaveAttribute(
      "data-status",
      "active",
    );
    expect(createBody).toMatchObject({ maxInteractionsPerDay: 50 });

    // --- Edit ---
    await page.getByTestId("plan-row").click();
    await expect(page.getByTestId("plan-detail")).toBeVisible();
    await expect(page.getByTestId("plan-max-interactions")).toHaveValue("50");

    await page.getByTestId("plan-active").click();
    // Clearing the field means unlimited daily interactions (`null`), not zero.
    await page.getByTestId("plan-max-interactions").fill("");
    await page.getByTestId("plan-save-button").click();

    await expect(
      page.getByTestId("plan-detail").getByTestId("plan-status-badge"),
    ).toHaveAttribute("data-status", "inactive");
    expect(updateBody).toMatchObject({ maxInteractionsPerDay: null });
  });
});

test.describe("Admin — Suscriptoras", () => {
  test("estado vacío — muestra mensaje cuando no hay suscriptoras, con stats en cero", async ({
    page,
  }) => {
    await seedAuthToken(page, "admin-e2e");
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

    await page.goto(`${BASE_URL}/admin/subscribers`);

    await expect(page.getByTestId("stat-total")).toContainText("0");
    await expect(page.getByTestId("subscribers-empty")).toBeVisible();
    await expect(page.getByTestId("subscriber-row")).toHaveCount(0);
  });

  test("happy path — lista suscriptoras con stats", async ({ page }) => {
    await seedAuthToken(page, "admin-e2e");
    await page.route(`${API_URL}/admin/subscription/stats`, (route) =>
      fulfillJson(route, {
        totalSubscribers: 2,
        byStatus: { active: 1, past_due: 1, canceled: 0 },
        byPlan: [{ planId: "plan-1", planName: "Premium Mensual", count: 2 }],
        mrrInCents: 1_990_000,
      }),
    );
    await page.route(`${API_URL}/admin/subscription/subscribers*`, (route) =>
      fulfillJson(route, {
        items: [
          {
            userId: "user-1",
            email: "paciente1@lila.app",
            planName: "Premium Mensual",
            status: "active",
            currentPeriodEnd: "2026-08-19T00:00:00.000Z",
          },
          {
            userId: "user-2",
            planName: "Premium Mensual",
            status: "past_due",
            currentPeriodEnd: "2026-07-15T00:00:00.000Z",
          },
        ],
        nextCursor: null,
      }),
    );

    await page.goto(`${BASE_URL}/admin/subscribers`);

    await expect(page.getByTestId("stat-total")).toContainText("2");
    await expect(page.getByTestId("stat-active")).toContainText("1");
    await expect(page.getByTestId("stat-mrr")).toContainText("19.900");
    await expect(page.getByTestId("subscriber-row")).toHaveCount(2);
  });
});
