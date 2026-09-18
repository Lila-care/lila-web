import { test, expect, type Page, type Route } from "@playwright/test";
import type { DiscountDto } from "../src/api/discounts";
import type { PlanDto } from "../src/api/plans";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";
const DISCOUNTS_PATH = "/admin/subscription/discounts";
const DAY_MS = 86_400_000;

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

// Same fixed UTC-5 math the app uses for America/Bogota.
function bogotaDate(offsetDays: number): string {
  return new Date(Date.now() - 5 * 3_600_000 + offsetDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function isoFromNow(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString();
}

// --- Fixtures ---

const PREMIUM: PlanDto = {
  planId: "plan-premium",
  name: "Premium",
  amountInCents: 5_990_000,
  currency: "COP",
  intervalDays: 30,
  status: "active",
  maxInteractionsPerDay: null,
};
const FREE: PlanDto = {
  planId: "plan-free",
  name: "Gratis",
  amountInCents: 0,
  currency: "COP",
  intervalDays: null,
  status: "active",
  maxInteractionsPerDay: 5,
};
const LEGACY: PlanDto = {
  planId: "plan-legacy",
  name: "Legacy",
  amountInCents: 3_000_000,
  currency: "COP",
  intervalDays: 30,
  status: "inactive",
  maxInteractionsPerDay: null,
};

const STATIC_CODE = "AUTO-9F3A1B2C";

function buildDiscount(overrides: Partial<DiscountDto>): DiscountDto {
  return {
    discountId: "disc-x",
    planId: PREMIUM.planId,
    kind: "custom",
    code: "SUMMER25",
    valueType: "percentage",
    value: 25,
    startsAt: isoFromNow(-5),
    endsAt: isoFromNow(20),
    status: "active",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const STATIC_DISCOUNT = buildDiscount({
  discountId: "disc-static",
  kind: "static",
  code: STATIC_CODE,
  valueType: "percentage",
  value: 20,
  createdAt: "2026-09-03T00:00:00.000Z",
});
const CUSTOM_DISCOUNT = buildDiscount({
  discountId: "disc-custom",
  code: "SUMMER25",
  valueType: "fixed",
  value: 1_000_000,
  createdAt: "2026-09-02T00:00:00.000Z",
});
const EXPIRED_DISCOUNT = buildDiscount({
  discountId: "disc-expired",
  code: "OLD10",
  value: 10,
  startsAt: isoFromNow(-40),
  endsAt: isoFromNow(-10),
  createdAt: "2026-08-01T00:00:00.000Z",
});
const INACTIVE_DISCOUNT = buildDiscount({
  discountId: "disc-inactive",
  code: "PAUSED5",
  value: 5,
  status: "inactive",
  createdAt: "2026-08-15T00:00:00.000Z",
});

interface RecordedRequest {
  method: string;
  pathname: string;
  search: string;
  body: unknown;
}

interface FailureResponse {
  status: number;
  body: unknown;
}

interface SubscriptionApiMock {
  discounts: DiscountDto[];
  requests: RecordedRequest[];
  listDelayMs: number;
  listFails: boolean;
  createFailure: FailureResponse | null;
  patchFailure: FailureResponse | null;
}

interface MockOptions {
  plans?: PlanDto[];
  discounts?: DiscountDto[];
  listDelayMs?: number;
  listFails?: boolean;
}

function filterDiscounts(all: DiscountDto[], search: URLSearchParams) {
  const planId = search.get("planId");
  const status = search.get("status");
  return all.filter(
    (d) => (!planId || d.planId === planId) && (!status || d.status === status),
  );
}

async function handleMutation(
  route: Route,
  api: SubscriptionApiMock,
  pathname: string,
) {
  const request = route.request();
  const body = request.postDataJSON();
  if (request.method() === "POST") {
    if (api.createFailure) {
      return fulfillJson(
        route,
        api.createFailure.body,
        api.createFailure.status,
      );
    }
    const created = buildDiscount({
      ...body,
      discountId: `disc-new-${api.discounts.length}`,
      code: body.kind === "static" ? "AUTO-DEADBEEF" : body.code,
      createdAt: new Date().toISOString(),
    });
    api.discounts = [...api.discounts, created];
    return fulfillJson(route, created, 201);
  }
  if (api.patchFailure) {
    return fulfillJson(route, api.patchFailure.body, api.patchFailure.status);
  }
  const discountId = pathname.split("/").pop();
  const current = api.discounts.find((d) => d.discountId === discountId);
  if (!current) return fulfillJson(route, { message: "Not found" }, 404);
  const updated = { ...current, ...body };
  api.discounts = api.discounts.map((d) =>
    d.discountId === discountId ? updated : d,
  );
  return fulfillJson(route, updated);
}

async function mockSubscriptionApi(
  page: Page,
  options: MockOptions = {},
): Promise<SubscriptionApiMock> {
  const api: SubscriptionApiMock = {
    discounts: options.discounts ?? [],
    requests: [],
    listDelayMs: options.listDelayMs ?? 0,
    listFails: options.listFails ?? false,
    createFailure: null,
    patchFailure: null,
  };
  const plans = options.plans ?? [PREMIUM, FREE, LEGACY];

  await page.route(
    (url) => url.href.startsWith(`${API_URL}/admin/subscription/plans`),
    (route) => fulfillJson(route, plans),
  );

  await page.route(
    (url) => url.href.startsWith(`${API_URL}${DISCOUNTS_PATH}`),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const isMutation = request.method() !== "GET";
      api.requests.push({
        method: request.method(),
        pathname: url.pathname,
        search: url.search,
        body: isMutation ? request.postDataJSON() : null,
      });
      if (isMutation) return handleMutation(route, api, url.pathname);
      if (api.listDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, api.listDelayMs));
      }
      if (api.listFails) {
        return fulfillJson(route, { message: "Internal error" }, 500);
      }
      return fulfillJson(
        route,
        filterDiscounts(api.discounts, url.searchParams),
      );
    },
  );
  return api;
}

async function openDiscountsPage(page: Page, options?: MockOptions) {
  await seedAuthToken(page);
  const api = await mockSubscriptionApi(page, options);
  await page.goto(`${BASE_URL}/admin/discounts`);
  return api;
}

async function chooseOption(page: Page, triggerTestId: string, name: RegExp) {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole("option", { name }).click();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const dialog = (page: Page) => page.getByTestId("discount-form-dialog");
const lastRequest = (api: SubscriptionApiMock, method: string) =>
  [...api.requests].reverse().find((r) => r.method === method);

test.describe("Admin Descuentos — estados de la lista", () => {
  test("loading — muestra skeleton mientras carga y luego la lista", async ({
    page,
  }) => {
    await openDiscountsPage(page, {
      discounts: [CUSTOM_DISCOUNT],
      listDelayMs: 600,
    });

    await expect(page.getByTestId("discounts-loading")).toBeVisible();
    await expect(page.getByTestId("discount-row")).toHaveCount(1);
    await expect(page.getByTestId("discounts-loading")).toHaveCount(0);
  });

  test("error — muestra mensaje y permite reintentar", async ({ page }) => {
    const api = await openDiscountsPage(page, {
      discounts: [CUSTOM_DISCOUNT],
      listFails: true,
    });

    await expect(page.getByTestId("discounts-error")).toBeVisible();
    api.listFails = false;
    await page.getByTestId("discounts-retry").click();

    await expect(page.getByTestId("discounts-error")).toHaveCount(0);
    await expect(page.getByTestId("discount-row")).toHaveCount(1);
  });

  test("vacío — sin descuentos muestra el estado vacío con CTA", async ({
    page,
  }) => {
    await openDiscountsPage(page, { discounts: [] });

    const empty = page.getByTestId("discounts-empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("Todavía no hay descuentos.");
    await empty.getByRole("button", { name: "Nuevo descuento" }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test("vacío con filtro — muestra 'sin resultados' y Limpiar filtros restaura la lista", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, {
      discounts: [CUSTOM_DISCOUNT, STATIC_DISCOUNT],
    });
    await expect(page.getByTestId("discount-row")).toHaveCount(2);

    await chooseOption(page, "discounts-filter-status", /Inactivos/);

    await expect(page.getByTestId("discounts-empty-filtered")).toBeVisible();
    expect(lastRequest(api, "GET")?.search).toContain("status=inactive");

    await page
      .getByTestId("discounts-empty-filtered")
      .getByRole("button", { name: "Limpiar filtros" })
      .click();
    await expect(page.getByTestId("discount-row")).toHaveCount(2);
    expect(lastRequest(api, "GET")?.search).toBe("");
  });

  test("filtros — plan y estado viajan como query params", async ({ page }) => {
    const api = await openDiscountsPage(page, {
      discounts: [CUSTOM_DISCOUNT, INACTIVE_DISCOUNT],
    });
    await expect(page.getByTestId("discount-row")).toHaveCount(2);

    await chooseOption(page, "discounts-filter-plan", /Premium/);
    await expect
      .poll(() => lastRequest(api, "GET")?.search)
      .toContain("planId=plan-premium");

    await chooseOption(page, "discounts-filter-status", /Activos/);
    await expect
      .poll(() => lastRequest(api, "GET")?.search)
      .toMatch(
        /planId=plan-premium.*status=active|status=active.*planId=plan-premium/,
      );
    await expect(page.getByTestId("discount-row")).toHaveCount(1);
  });

  test("success — lista estático y custom; el estático se muestra 'Automático' y nunca su AUTO-", async ({
    page,
  }) => {
    await openDiscountsPage(page, {
      discounts: [
        STATIC_DISCOUNT,
        CUSTOM_DISCOUNT,
        EXPIRED_DISCOUNT,
        INACTIVE_DISCOUNT,
      ],
    });

    const table = page.getByRole("table");
    await expect(page.getByTestId("discount-row")).toHaveCount(4);
    await expect(table.getByTestId("discount-kind-badge").first()).toHaveText(
      "Automático",
    );
    await expect(table.getByTestId("discount-code")).toContainText([
      "SUMMER25",
      "PAUSED5",
      "OLD10",
    ]);

    const statuses = await table
      .getByTestId("discount-status-badge")
      .evaluateAll((els) => els.map((el) => el.textContent));
    expect(statuses).toEqual(["Vigente", "Vigente", "Inactivo", "Vencido"]);

    await expect(page.locator("body")).not.toContainText("AUTO-");
    expect(await page.content()).not.toContain("AUTO-");
  });
});

test.describe("Admin Descuentos — crear", () => {
  test("crear custom — normaliza el código, convierte fechas a UTC y refresca la lista", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, { discounts: [] });
    await page.getByTestId("discounts-create-button").click();

    await chooseOption(page, "discount-plan-select", /Premium/);
    await page.locator("#discount-code-input").fill("spring15");
    await expect(page.locator("#discount-code-input")).toHaveValue("SPRING15");
    await page.getByLabel(/^Valor/).fill("15");
    await page.getByLabel(/^Termina/).fill(bogotaDate(30));

    await expect(page.getByTestId("discount-price-preview")).toContainText(
      "$ 50.915",
    );

    await page.getByTestId("discount-form-submit").click();

    await expect(page.getByTestId("discounts-success")).toContainText(
      "Descuento creado.",
    );
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByTestId("discount-row")).toHaveCount(1);

    const post = lastRequest(api, "POST")?.body as Record<string, unknown>;
    expect(post).toMatchObject({
      planId: "plan-premium",
      kind: "custom",
      code: "SPRING15",
      valueType: "percentage",
      value: 15,
    });
    expect(String(post.startsAt)).toMatch(/T05:00:00\.000Z$/);
    expect(String(post.endsAt)).toMatch(/T04:59:59\.999Z$/);
  });

  test("crear estático — no hay campo de código y el monto fijo viaja en centavos", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, { discounts: [] });
    await page.getByTestId("discounts-create-button").click();

    await chooseOption(page, "discount-plan-select", /Premium/);
    await page.getByRole("radio", { name: /Automático/ }).check();
    await expect(page.locator("#discount-code-input")).toHaveCount(0);

    await page.getByLabel("Monto fijo (COP)").check();
    await page.getByLabel(/^Valor/).fill("5000");
    await page.getByLabel(/^Termina/).fill(bogotaDate(10));
    await page.getByTestId("discount-form-submit").click();

    await expect(page.getByTestId("discounts-success")).toBeVisible();
    const post = lastRequest(api, "POST")?.body as Record<string, unknown>;
    expect(post).toMatchObject({
      kind: "static",
      valueType: "fixed",
      value: 500_000,
    });
    expect(post).not.toHaveProperty("code");
    await expect(
      page.getByRole("table").getByTestId("discount-kind-badge"),
    ).toHaveText("Automático");
    expect(await page.content()).not.toContain("AUTO-");
  });

  test("solo ofrece planes activos con precio", async ({ page }) => {
    await openDiscountsPage(page, { discounts: [] });
    await page.getByTestId("discounts-create-button").click();
    await page.getByTestId("discount-plan-select").click();

    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("option", { name: /Premium/ })).toBeVisible();
  });

  test("sin planes elegibles — el plan queda deshabilitado y no se puede crear", async ({
    page,
  }) => {
    await openDiscountsPage(page, { discounts: [], plans: [FREE, LEGACY] });
    await page.getByTestId("discounts-create-button").click();

    await expect(page.getByTestId("discount-plan-select")).toBeDisabled();
    await expect(page.getByTestId("discount-form-submit")).toBeDisabled();
  });

  test("409 con código duplicado — error en el campo Código, el form conserva los datos", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, { discounts: [] });
    api.createFailure = { status: 409, body: { message: "Conflict" } };
    await page.getByTestId("discounts-create-button").click();

    await chooseOption(page, "discount-plan-select", /Premium/);
    await page.locator("#discount-code-input").fill("dup");
    await page.getByLabel(/^Valor/).fill("10");
    await page.getByLabel(/^Termina/).fill(bogotaDate(5));
    await page.getByTestId("discount-form-submit").click();

    const codeInput = page.locator("#discount-code-input");
    await expect(page.getByTestId("discount-code-input-error")).toContainText(
      "Ya existe un descuento con el código DUP",
    );
    await expect(codeInput).toHaveAttribute("aria-invalid", "true");
    await expect(codeInput).toBeFocused();
    await expect(codeInput).toHaveValue("DUP");
    await expect(dialog(page)).toBeVisible();
  });

  test("409 con estático solapado — alert de resumen y ambas fechas inválidas", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, { discounts: [] });
    api.createFailure = { status: 409, body: { message: "Conflict" } };
    await page.getByTestId("discounts-create-button").click();

    await chooseOption(page, "discount-plan-select", /Premium/);
    await page.getByRole("radio", { name: /Automático/ }).check();
    await page.getByLabel(/^Valor/).fill("10");
    await page.getByLabel(/^Termina/).fill(bogotaDate(5));
    await page.getByTestId("discount-form-submit").click();

    await expect(page.getByTestId("discount-form-error")).toContainText(
      "Ya hay un descuento automático en este plan con fechas que se cruzan",
    );
    await expect(page.getByLabel(/^Inicia/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel(/^Termina/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("400 del BE — muestra los mensajes en el resumen", async ({ page }) => {
    const api = await openDiscountsPage(page, { discounts: [] });
    api.createFailure = {
      status: 400,
      body: { message: ["value must be an integer", "endsAt is invalid"] },
    };
    await page.getByTestId("discounts-create-button").click();

    await chooseOption(page, "discount-plan-select", /Premium/);
    await page.locator("#discount-code-input").fill("valid1");
    await page.getByLabel(/^Valor/).fill("10");
    await page.getByLabel(/^Termina/).fill(bogotaDate(5));
    await page.getByTestId("discount-form-submit").click();

    const summary = page.getByTestId("discount-form-error");
    await expect(summary).toContainText("value must be an integer");
    await expect(summary).toContainText("endsAt is invalid");
  });

  test("validación cliente — porcentaje fuera de rango, fijo >= precio y fechas inválidas", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, { discounts: [] });
    await page.getByTestId("discounts-create-button").click();

    await page.getByTestId("discount-form-submit").click();
    await expect(page.getByTestId("discount-plan-error")).toContainText(
      "Selecciona un plan.",
    );
    await expect(page.getByTestId("discount-code-input-error")).toContainText(
      "Ingresa un código.",
    );
    await expect(page.getByTestId("discount-plan-select")).toBeFocused();

    await chooseOption(page, "discount-plan-select", /Premium/);
    await page.locator("#discount-code-input").fill("ab");
    await page.getByLabel(/^Valor/).fill("150");
    await page.getByLabel(/^Termina/).fill(bogotaDate(-3));
    await page.getByTestId("discount-form-submit").click();

    await expect(page.getByTestId("discount-code-input-error")).toContainText(
      "Usa entre 3 y 32 caracteres",
    );
    await expect(page.getByTestId("discount-value-error")).toContainText(
      "porcentaje entero entre 1 y 99",
    );
    await expect(page.getByTestId("discount-ends-error")).toContainText(
      "anterior a la de inicio",
    );

    await page.getByLabel("Monto fijo (COP)").check();
    await page.getByLabel(/^Valor/).fill("59900");
    await expect(page.getByTestId("discount-value-error")).toContainText(
      "menor al precio del plan",
    );

    await page.getByLabel(/^Inicia/).fill(bogotaDate(-10));
    await expect(page.getByTestId("discount-ends-error")).toContainText(
      "ya pasó",
    );
    expect(api.requests.filter((r) => r.method === "POST")).toHaveLength(0);
  });
});

test.describe("Admin Descuentos — editar, activar y desactivar", () => {
  test("editar — plan/tipo/código en solo lectura y PATCH solo con los campos cambiados", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, { discounts: [CUSTOM_DISCOUNT] });
    await page.getByTestId("discount-edit-button").first().click();

    const summary = page.getByTestId("discount-locked-summary");
    await expect(summary).toContainText("Premium");
    await expect(summary).toContainText("SUMMER25");
    await expect(page.locator("#discount-code-input")).toHaveCount(0);
    await expect(page.getByLabel(/^Valor/)).toHaveValue("10000");

    await page.getByLabel(/^Valor/).fill("12000");
    await page.getByTestId("discount-form-submit").click();

    await expect(page.getByTestId("discounts-success")).toContainText(
      "Cambios guardados.",
    );
    expect(lastRequest(api, "PATCH")).toMatchObject({
      pathname: `${DISCOUNTS_PATH}/disc-custom`,
      body: { value: 1_200_000 },
    });
    expect(Object.keys(lastRequest(api, "PATCH")?.body as object)).toEqual([
      "value",
    ]);
  });

  test("editar un estático — no expone su código AUTO- en ninguna parte del DOM", async ({
    page,
  }) => {
    await openDiscountsPage(page, { discounts: [STATIC_DISCOUNT] });
    await page.getByTestId("discount-edit-button").first().click();

    await expect(page.getByTestId("discount-locked-summary")).toContainText(
      "Automático",
    );
    expect(await page.content()).not.toContain("AUTO-");
  });

  test("editar sin cambios — cierra sin hacer request", async ({ page }) => {
    const api = await openDiscountsPage(page, { discounts: [CUSTOM_DISCOUNT] });
    await page.getByTestId("discount-edit-button").first().click();
    await page.getByTestId("discount-form-submit").click();

    await expect(dialog(page)).toHaveCount(0);
    expect(api.requests.filter((r) => r.method === "PATCH")).toHaveLength(0);
  });

  test("desactivar — pide confirmación; cancelar no hace request y confirmar envía el PATCH", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, {
      discounts: [STATIC_DISCOUNT, CUSTOM_DISCOUNT],
    });

    await page.getByTestId("discount-toggle-button").first().click();
    const confirm = page.getByTestId("discount-deactivate-dialog");
    await expect(confirm).toContainText("¿Desactivar este descuento?");
    await expect(confirm).toContainText("Automático · Premium · 20 %");
    expect(await page.content()).not.toContain("AUTO-");

    await page.getByTestId("discount-deactivate-cancel").click();
    await expect(confirm).toHaveCount(0);
    expect(api.requests.filter((r) => r.method === "PATCH")).toHaveLength(0);

    await page.getByTestId("discount-toggle-button").first().click();
    await page.getByTestId("discount-deactivate-confirm").click();

    await expect(page.getByTestId("discounts-success")).toContainText(
      "Descuento desactivado.",
    );
    expect(lastRequest(api, "PATCH")).toMatchObject({
      pathname: `${DISCOUNTS_PATH}/disc-static`,
      body: { status: "inactive" },
    });
    await expect(page.getByTestId("discount-status-badge").first()).toHaveText(
      "Inactivo",
    );
  });

  test("activar — sin confirmación; 409 muestra el error de acción", async ({
    page,
  }) => {
    const api = await openDiscountsPage(page, {
      discounts: [INACTIVE_DISCOUNT],
    });
    api.patchFailure = { status: 409, body: { message: "Conflict" } };

    await page.getByTestId("discount-toggle-button").first().click();

    await expect(page.getByTestId("discounts-action-error")).toContainText(
      "ya hay otro descuento automático en este plan",
    );
    await expect(page.getByTestId("discount-status-badge").first()).toHaveText(
      "Inactivo",
    );
  });

  test("activar — con éxito muestra el banner", async ({ page }) => {
    await openDiscountsPage(page, { discounts: [INACTIVE_DISCOUNT] });
    await page.getByTestId("discount-toggle-button").first().click();

    await expect(page.getByTestId("discounts-success")).toContainText(
      "Descuento activado.",
    );
    await expect(page.getByTestId("discount-status-badge").first()).toHaveText(
      "Vigente",
    );
  });
});

test.describe("Admin Descuentos — teclado y accesibilidad", () => {
  test("Escape cierra el dialog, el clic en el overlay no, y Tab no escapa del dialog", async ({
    page,
  }) => {
    await openDiscountsPage(page, { discounts: [CUSTOM_DISCOUNT] });
    await page.getByTestId("discounts-create-button").click();
    await expect(dialog(page)).toBeVisible();

    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeVisible();

    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() =>
        Boolean(
          document.activeElement?.closest(
            '[data-testid="discount-form-dialog"]',
          ),
        ),
      );
      expect(inside).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
  });

  test("el nav marca Descuentos como página actual", async ({ page }) => {
    await openDiscountsPage(page, { discounts: [CUSTOM_DISCOUNT] });

    const nav = page.getByRole("navigation", {
      name: "Navegación de administración",
    });
    await expect(nav.getByRole("link", { name: "Descuentos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

test.describe("Admin Descuentos — 375px", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("lista — cards visibles, tabla oculta y sin scroll horizontal", async ({
    page,
  }) => {
    await openDiscountsPage(page, {
      discounts: [STATIC_DISCOUNT, CUSTOM_DISCOUNT, EXPIRED_DISCOUNT],
    });

    await expect(page.getByTestId("discount-card")).toHaveCount(3);
    await expect(page.getByTestId("discount-row").first()).toBeHidden();
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("body")).not.toContainText("AUTO-");
  });

  test("estados loading, error y vacío — sin scroll horizontal", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockSubscriptionApi(page, {
      discounts: [],
      listDelayMs: 500,
      listFails: true,
    });
    await page.goto(`${BASE_URL}/admin/discounts`);

    await expect(page.getByTestId("discounts-loading")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId("discounts-error")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    api.listDelayMs = 0;
    api.listFails = false;
    await page.getByTestId("discounts-retry").click();
    await expect(page.getByTestId("discounts-empty")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("dialog — ocupa toda la pantalla, sin scroll horizontal y con botones apilados", async ({
    page,
  }) => {
    await openDiscountsPage(page, { discounts: [CUSTOM_DISCOUNT] });
    await page.getByTestId("discounts-create-button").click();

    const box = await dialog(page).boundingBox();
    expect(box?.width).toBe(375);
    expect(box?.height).toBe(667);
    await expectNoHorizontalOverflow(page);

    const submit = await page.getByTestId("discount-form-submit").boundingBox();
    const cancel = await page.getByTestId("discount-form-cancel").boundingBox();
    expect(submit && cancel && submit.y < cancel.y).toBe(true);
    expect(submit?.height).toBeGreaterThanOrEqual(40);
  });
});

test.describe("AdminLayout — header y navegación", () => {
  test("las 4 páginas admin existentes siguen renderizando, con el nuevo ítem y sin overflow a 375px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await seedAuthToken(page);
    // Data is irrelevant here: every API call fails so each page renders its own error state.
    await page.route(
      (url) => url.href.startsWith(API_URL),
      (route) => fulfillJson(route, { message: "Internal error" }, 500),
    );

    for (const path of [
      "/admin/dashboard",
      "/admin/users",
      "/admin/reports",
      "/admin/forms",
      "/admin/discounts",
    ]) {
      await page.goto(`${BASE_URL}${path}`);
      const nav = page.getByRole("navigation", {
        name: "Navegación de administración",
      });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("link")).toHaveCount(5);
      await expect(nav.getByRole("link", { name: "Descuentos" })).toBeVisible();
      await expect(
        nav.getByRole("link", { name: "Descuentos" }),
      ).toBeInViewport();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("el menú de usuario no queda recortado en móvil", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openDiscountsPage(page, { discounts: [] });

    await page.getByTestId("user-menu-trigger").click();
    await expect(page.getByTestId("logout-button")).toBeInViewport();
  });
});
