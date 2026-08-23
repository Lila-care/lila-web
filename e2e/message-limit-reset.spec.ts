import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 10 };

function agentMeBody(overrides: {
  dailyQuestionCount: number;
  hasActiveSubscription: boolean;
}) {
  return {
    userId: "test-user",
    templateVersion: 1,
    isGuest: false,
    hasActiveTemplate: true,
    freeQuestionLimit: 3,
    onboarding: { pending: false },
    ...overrides,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Same shape as onboarding.spec.ts — the app only base64-decodes the JWT payload, never
// verifies the signature.
function fakeIdToken(): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "paciente@lila.app",
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

async function mockCommonRoutes(
  page: Page,
  agentMe: ReturnType<typeof agentMeBody>,
) {
  let chatCallCount = 0;
  await page.route(`${API_URL}/lila/config`, (route) =>
    fulfillJson(route, CONFIG_BODY),
  );
  await page.route(`${API_URL}/lila/agent/me`, (route) =>
    fulfillJson(route, agentMe),
  );
  await page.route(`${API_URL}/lila/conversations`, (route) =>
    fulfillJson(route, []),
  );
  await page.route(`${API_URL}/lila/chat`, (route) => {
    chatCallCount += 1;
    return fulfillJson(route, {
      reply: "¡Hola! Cuéntame más.",
      conversationId: "conv-1",
      tokensUsed: 12,
    });
  });
  return () => chatCallCount;
}

// Seeds localStorage before the app boots — mirrors seedAuthToken in onboarding.spec.ts.
async function seedStorage(page: Page, values: Record<string, string>) {
  await page.goto(BASE_URL);
  await page.evaluate((entries) => {
    for (const [key, value] of entries) {
      localStorage.setItem(key, value);
    }
  }, Object.entries(values));
}

async function sendOneMessage(page: Page, text = "Hola Lila") {
  await page.getByPlaceholder("Escríbeme...").fill(text);
  await page.getByLabel("Enviar").click();
}

// Regression context: the daily free-message limit for authenticated users used to be a
// plain `lila_user_count` localStorage counter (with its own date-stamping fix, see git
// history). It's now enforced server-side — `GET /lila/agent/me` returns `dailyQuestionCount`
// (today's count, computed server-side) and `hasActiveSubscription`, and `POST /lila/chat`
// 403s with `upgradeRequired: true` once a non-subscriber hits `freeQuestionLimit`.
// `useLilaChat` now gates on those server fields instead of any client-side counter.
test.describe("Daily free-message limit is server-driven (dailyQuestionCount)", () => {
  test("un lila_user_count viejo en localStorage ya no tiene efecto — el server decide vía dailyQuestionCount", async ({
    page,
  }) => {
    const getChatCallCount = await mockCommonRoutes(
      page,
      agentMeBody({ dailyQuestionCount: 1, hasActiveSubscription: false }),
    );

    const token = fakeIdToken();
    // Leftover from the old mechanism — should be entirely ignored now.
    await seedStorage(page, {
      lila_id_token: token,
      lila_user_count: "10",
      lila_user_count_date: new Date().toDateString(),
    });

    await page.goto(`${BASE_URL}/chat`);
    await sendOneMessage(page);

    await expect(page.getByText("Chat con Lila")).toBeVisible();
    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toHaveCount(0);
    expect(getChatCallCount()).toBe(1);
  });

  test("dailyQuestionCount al límite bloquea sin llamar a /lila/chat y conserva el borrador", async ({
    page,
  }) => {
    const getChatCallCount = await mockCommonRoutes(
      page,
      agentMeBody({ dailyQuestionCount: 3, hasActiveSubscription: false }),
    );

    const token = fakeIdToken();
    await seedStorage(page, { lila_id_token: token });

    await page.goto(`${BASE_URL}/chat`);
    await sendOneMessage(page, "¿Puedo seguir preguntando?");

    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toBeVisible();
    // Preemptive client-side gate — never hit the network.
    expect(getChatCallCount()).toBe(0);
    // The draft is preserved so the user can retry after upgrading.
    await expect(page.getByPlaceholder("Escríbeme...")).toHaveValue(
      "¿Puedo seguir preguntando?",
    );
  });

  test("con suscripción activa nunca se muestra el gate, aunque dailyQuestionCount ya supere el límite", async ({
    page,
  }) => {
    const getChatCallCount = await mockCommonRoutes(
      page,
      agentMeBody({ dailyQuestionCount: 12, hasActiveSubscription: true }),
    );

    const token = fakeIdToken();
    await seedStorage(page, { lila_id_token: token });

    await page.goto(`${BASE_URL}/chat`);
    await sendOneMessage(page);

    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toHaveCount(0);
    expect(getChatCallCount()).toBe(1);
  });

  test("403 de /lila/chat con upgradeRequired muestra el gate y conserva el borrador", async ({
    page,
  }) => {
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(
        route,
        agentMeBody({ dailyQuestionCount: 2, hasActiveSubscription: false }),
      ),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/lila/chat`, (route) =>
      fulfillJson(
        route,
        {
          message: "Daily free message limit reached",
          freeQuestionLimit: 3,
          upgradeRequired: true,
        },
        403,
      ),
    );

    const token = fakeIdToken();
    await seedStorage(page, { lila_id_token: token });

    await page.goto(`${BASE_URL}/chat`);
    await sendOneMessage(page, "Otra pregunta más");

    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Escríbeme...")).toHaveValue(
      "Otra pregunta más",
    );
  });
});
