import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

// upgradePromptLimit=1 so a single successful authenticated message trips the gate
// (for users without an active subscription).
const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 1 };

function agentMeBody(hasActiveSubscription: boolean) {
  return {
    userId: "test-user",
    templateVersion: 1,
    isGuest: false,
    hasActiveTemplate: true,
    hasActiveSubscription,
    freeQuestionLimit: 3,
    onboarding: { pending: false },
  };
}

function fakeIdToken(): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "valentina@lila.app",
    name: "Valentina",
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function seedAuthToken(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t) => localStorage.setItem("lila_id_token", t), token);
  // Clears any leftover local message counter from a previous test run in the same worker so
  // the very first message reliably crosses `upgradePromptLimit`.
  await page.evaluate(() => localStorage.removeItem("lila_user_count"));
  // Seed the counter already past the limit too, to cover the "returning subscriber whose
  // counter was already high before they subscribed" case, not just the freshly-tripped one.
  await page.evaluate(() =>
    localStorage.setItem("lila_user_count", "5"),
  );
}

async function mockChatRoutes(page: Page, hasActiveSubscription: boolean) {
  await page.route(`${API_URL}/lila/config`, (route) =>
    fulfillJson(route, CONFIG_BODY),
  );
  await page.route(`${API_URL}/lila/agent/me`, (route) =>
    fulfillJson(route, agentMeBody(hasActiveSubscription)),
  );
  await page.route(`${API_URL}/lila/conversations`, (route) =>
    fulfillJson(route, []),
  );
  await page.route(`${API_URL}/lila/chat`, (route) =>
    fulfillJson(route, {
      reply: "¡Hola! ¿En qué te puedo ayudar hoy?",
      conversationId: "conv-1",
      tokensUsed: 12,
    }),
  );
  await page.route(`${API_URL}/period/summary`, (route) =>
    fulfillJson(route, {
      lastPeriod: null,
      cycle: null,
      activePeriod: null,
    }),
  );
}

// Regression test for: `useLilaChat.ts`'s `showUpgradeGate` was a pure client-side message
// counter (`lila_user_count` vs `upgradePromptLimit`) that never checked whether the user
// already had a paid subscription. A real subscriber (active `LILA_SUBSCRIPTION`, confirmed
// payment) kept seeing "Has llegado a tu límite por ahora" in production. Root cause:
// `src/api/lila.ts`'s `UserAgent` interface didn't even declare the `hasActiveSubscription`
// field the backend (`GET /lila/agent/me`) already returns, so the FE gate never read it.
// Fix: `UserAgent` now types the field, and `useLilaChat.ts` reads it via `refreshAgentMe` to
// suppress `setShowUpgradeGate(true)` for active subscribers — the message counter itself still
// increments (kept for telemetry), it just never surfaces the modal for them.
test.describe("useLilaChat — upgrade gate respects active subscription", () => {
  test("usuario con suscripción activa NO ve el modal de upgrade aunque supere el límite", async ({
    page,
  }) => {
    await mockChatRoutes(page, /* hasActiveSubscription */ true);

    await seedAuthToken(page, fakeIdToken());
    await page.goto(`${BASE_URL}/chat`);

    const composer = page.getByPlaceholder("Escríbeme...");
    await composer.click();
    await composer.fill("Hola Lila");
    await composer.press("Enter");

    await expect(
      page.getByTestId("message-bubble").last(),
    ).toContainText("¡Hola! ¿En qué te puedo ayudar hoy?");

    // Give the (absent) gate a chance to appear before asserting it never does.
    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toHaveCount(0);
  });

  test("usuario SIN suscripción sigue viendo el modal de upgrade al superar el límite", async ({
    page,
  }) => {
    await mockChatRoutes(page, /* hasActiveSubscription */ false);

    await seedAuthToken(page, fakeIdToken());
    await page.goto(`${BASE_URL}/chat`);

    const composer = page.getByPlaceholder("Escríbeme...");
    await composer.click();
    await composer.fill("Hola Lila");
    await composer.press("Enter");

    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toBeVisible();
  });
});
