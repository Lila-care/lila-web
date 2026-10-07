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
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "valentina@lila.app",
    name: "Valentina",
  };
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fakesignature`;
}

// Signed-in user with an already-completed onboarding, whose next message gets `chatStatus`/`chatBody`.
async function openChat(page: Page, chatStatus: number, chatBody: unknown) {
  await page.route(`${API_URL}/lila/config`, (route) =>
    fulfillJson(route, { freeQuestionLimit: 3, upgradePromptLimit: 10 }),
  );
  await page.route(`${API_URL}/lila/agent/me`, (route) =>
    fulfillJson(route, {
      userId: "test-user",
      templateVersion: 1,
      isGuest: false,
      hasActiveTemplate: true,
      freeQuestionLimit: 3,
      onboarding: { pending: false },
      entitlements: { daily_chat_messages: 5, ai_reports: false },
    }),
  );
  await page.route(`${API_URL}/lila/conversations`, (route) =>
    fulfillJson(route, []),
  );
  await page.route(`${API_URL}/lila/chat`, (route) =>
    fulfillJson(route, chatBody, chatStatus),
  );
  await page.goto(BASE_URL);
  await page.evaluate(
    (t) => localStorage.setItem("lila_id_token", t),
    fakeIdToken(),
  );
  await page.goto(`${BASE_URL}/chat`);
  const composer = page.getByPlaceholder("Escríbeme...");
  await composer.click();
  await composer.fill("Hola Lila");
  await composer.press("Enter");
}

test.describe("Chat — modal de upgrade según el code del 403", () => {
  test("LIMIT_REACHED + daily_chat_messages muestra el límite de hoy y cuándo se reinicia", async ({
    page,
  }) => {
    await openChat(page, 403, {
      message: "limit",
      code: "LIMIT_REACHED",
      feature: "daily_chat_messages",
      limit: 5,
      upgradeRequired: true,
      freeQuestionLimit: 3,
    });
    const modal = page.getByTestId("upgrade-gate-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("data-reason", "daily_limit");
    await expect(modal).toContainText("Llegaste al límite de mensajes de hoy");
    await expect(modal).toContainText("Usaste tus 5 mensajes de hoy");
    await expect(modal).toContainText("mañana a la medianoche (hora de Bogotá)");
    await expect(modal).toContainText("Mejorar mi plan");
  });

  test("FEATURE_NOT_IN_PLAN + ai_reports explica que los reportes son de planes de pago", async ({
    page,
  }) => {
    await openChat(page, 403, {
      message: "not in plan",
      code: "FEATURE_NOT_IN_PLAN",
      feature: "ai_reports",
      upgradeRequired: true,
    });
    const modal = page.getByTestId("upgrade-gate-modal");
    await expect(modal).toHaveAttribute("data-reason", "ai_reports");
    await expect(modal).toContainText(
      "Los reportes del ciclo son parte de un plan de pago",
    );
  });

  test("403 viejo (solo upgradeRequired + freeQuestionLimit) abre el modal genérico", async ({
    page,
  }) => {
    await openChat(page, 403, {
      message: "upgrade",
      upgradeRequired: true,
      freeQuestionLimit: 3,
    });
    const modal = page.getByTestId("upgrade-gate-modal");
    await expect(modal).toHaveAttribute("data-reason", "generic");
    await expect(modal).toContainText("Has llegado a tu límite por ahora");
  });

  test("un 500 no abre el modal: queda el error inline", async ({ page }) => {
    await openChat(page, 500, { message: "boom" });
    await expect(page.getByTestId("upgrade-gate-modal")).toHaveCount(0);
    await expect(page.getByText(/HTTP 500/)).toBeVisible();
  });
});

test.describe("Chat — invitadas y accesibilidad del modal", () => {
  test("LIMIT_REACHED a una invitada abre el login gate, no 'Mejorar mi plan'", async ({
    page,
  }) => {
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, { freeQuestionLimit: 3, upgradePromptLimit: 10 }),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, {
        userId: "guest",
        templateVersion: 1,
        isGuest: true,
        hasActiveTemplate: true,
        freeQuestionLimit: 3,
        onboarding: { pending: false },
      }),
    );
    await page.route(`${API_URL}/lila/chat`, (route) =>
      fulfillJson(
        route,
        {
          message: "limit",
          code: "LIMIT_REACHED",
          feature: "daily_chat_messages",
          limit: 3,
          upgradeRequired: true,
        },
        403,
      ),
    );
    await page.goto(`${BASE_URL}/chat`);
    const input = page.getByTestId("empty-state").getByPlaceholder("Escríbeme...");
    await input.fill("Hola");
    await input.press("Enter");

    await expect(page.getByText("Continúa hablando con Lila")).toBeVisible();
    await expect(page.getByTestId("upgrade-gate-modal")).toHaveCount(0);
  });

  test("el modal enfoca el CTA, atrapa el foco y cierra con Esc", async ({
    page,
  }) => {
    await openChat(page, 403, {
      message: "limit",
      code: "LIMIT_REACHED",
      feature: "daily_chat_messages",
      limit: 5,
      upgradeRequired: true,
    });
    const modal = page.getByTestId("upgrade-gate-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("role", "dialog");
    await expect(modal.getByRole("button", { name: "Mejorar mi plan" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(modal.locator(":focus")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
  });
});
