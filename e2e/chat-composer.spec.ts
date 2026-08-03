import { test, expect, type Route } from "@playwright/test";

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

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
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
});
