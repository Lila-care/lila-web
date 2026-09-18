import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

// upgradePromptLimit=1 so a single successful authenticated message trips the gate.
const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 1 };

const AGENT_ME_BODY = {
  userId: "test-user",
  templateVersion: 1,
  isGuest: false,
  hasActiveTemplate: true,
  freeQuestionLimit: 3,
  onboarding: { pending: false },
};

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
}

// Regression test for: UpgradeGateModal's primary CTA ("Mejorar mi plan") had `onClick={onClose}`
// — identical to the secondary "Volver mañana" link — so it just closed the modal instead of
// taking the user anywhere. Root cause: src/Chat/UpgradeGateModal.tsx never wired a navigation
// action to the primary button. Fix: navigate to /perfil (closest existing "manage your plan"
// destination on this branch — there is no dedicated upgrade/checkout route yet) before closing,
// mirroring the `navigate()` pattern LoginGateModal already uses for its own CTA.
test.describe("UpgradeGateModal — primary CTA navigates instead of no-op", () => {
  test("click en 'Mejorar mi plan' navega a /perfil", async ({ page }) => {
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
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

    await seedAuthToken(page, fakeIdToken());
    await page.goto(`${BASE_URL}/chat`);

    const composer = page.getByPlaceholder("Escríbeme...");
    await composer.click();
    await composer.fill("Hola Lila");
    await composer.press("Enter");

    // One successful authenticated message already reaches upgradePromptLimit=1.
    await expect(page.getByText("Has llegado a tu límite por ahora")).toBeVisible();

    await page.getByRole("button", { name: "Mejorar mi plan" }).click();

    await expect(page).toHaveURL(`${BASE_URL}/perfil`);
    await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
    // The modal must actually close on navigation, not linger on top of the new page.
    await expect(page.getByText("Has llegado a tu límite por ahora")).toHaveCount(0);
  });
});
