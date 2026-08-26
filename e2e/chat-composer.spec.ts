import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 10 };

const AGENT_ME_BODY = {
  userId: "test-user",
  templateVersion: 1,
  isGuest: true,
  hasActiveTemplate: true,
  freeQuestionLimit: 3,
  onboarding: { pending: false },
};

function fakeIdToken(claims: Record<string, unknown> = {}): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "valentina@lila.app",
    name: "Valentina",
    ...claims,
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
}

// Regression test for: pressing Enter in the EmptyState composer (the very first composer shown
// on /chat, before any conversation exists) left the text sitting in the input and never sent the
// message — clicking the submit button worked fine. Root cause: EmptyState.tsx relied entirely on
// the browser's native implicit form submission (a single <input type="text"> + a
// <button type="submit">, no onKeyDown) instead of an explicit handler. In this app's runtime that
// native implicit submission never fires the form's submit/click default action (confirmed via
// direct DOM instrumentation: the Enter keydown/keyup dispatch correctly and defaultPrevented stays
// false through both capture and bubble phases, yet no click/submit event is ever raised — while
// calling form.requestSubmit() manually executes the React onSubmit handler correctly). ChatWindow's
// composer (once a conversation exists) never had this problem because it uses a <textarea>, which
// never auto-submits on Enter, and already implements Enter-to-send explicitly via onKeyDown. Fix:
// EmptyState now has the same explicit onKeyDown handler.
test.describe("Chat composer — Enter sends the message", () => {
  test("EmptyState composer (primera carga, sin conversación previa) envía con Enter", async ({
    page,
  }) => {
    let chatRequestBody: unknown = null;

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );
    await page.route(`${API_URL}/lila/chat`, async (route) => {
      chatRequestBody = route.request().postDataJSON();
      await fulfillJson(route, {
        reply: "Hola, estoy bien, gracias por preguntar.",
        conversationId: "conv-1",
        tokensUsed: 12,
      });
    });

    await page.goto(`${BASE_URL}/chat`);

    const emptyState = page.getByTestId("empty-state");
    await expect(emptyState).toBeVisible();

    const input = emptyState.getByPlaceholder("Escríbeme...");
    await input.click();
    await input.fill("Hola Lila, como estas");
    await input.press("Enter");

    // The request must have reached the backend with the typed message...
    await expect
      .poll(() => chatRequestBody)
      .toMatchObject({ message: "Hola Lila, como estas" });

    // ...and the EmptyState (chip layout) must be replaced by the conversation view, exactly
    // like the submit-button path already did before this fix.
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
    await expect(page.getByTestId("message-bubble").first()).toContainText(
      "Hola Lila, como estas",
    );
  });

  // Regression test for KAN-58 follow-up: ChatWindow's real composer (used once a conversation
  // already exists, e.g. an authenticated session with a seeded greeting — no EmptyState
  // involved) disables its <textarea> via `disabled={isLoading}` while a message is in flight.
  // Browsers force-blur a control the instant it's disabled, and nothing refocused it once the
  // reply came back and it was re-enabled — reported as "cuando doy enter, se pierde el foco del
  // input". Fix: ChatWindow refocuses the textarea when `isLoading` flips back to false (skipping
  // the mount-time render so it doesn't steal focus on initial page load).
  test("composer real (con conversación ya iniciada) recupera el foco tras enviar con Enter", async ({
    page,
  }) => {
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, {
        userId: "test-user",
        templateVersion: 1,
        isGuest: false,
        hasActiveTemplate: true,
        freeQuestionLimit: 3,
        onboarding: {
          pending: true,
          greetingMessage: "¡Hola! Antes de empezar, quiero conocerte mejor.",
        },
      }),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/lila/chat`, (route) =>
      fulfillJson(route, {
        reply: "¡Hola, Cami! Qué lindo nombre.",
        conversationId: "conv-1",
        tokensUsed: 12,
      }),
    );

    await seedAuthToken(page, fakeIdToken());
    await page.goto(`${BASE_URL}/chat`);

    // The seeded greeting means messages.length > 0 from the start — this is the real
    // ChatWindow composer, never EmptyState's.
    await expect(page.getByTestId("empty-state")).toHaveCount(0);

    const composer = page.getByPlaceholder("Escríbeme...");
    await composer.click();
    await composer.fill("Me llamo Cami");
    await composer.press("Enter");

    await expect(page.getByTestId("message-bubble").last()).toContainText(
      "Qué lindo nombre",
    );
    await expect(composer).toBeFocused();
  });
});
