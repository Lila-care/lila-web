import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 10 };

const AGENT_ME_BODY = {
  userId: "test-user",
  templateVersion: 1,
  isGuest: false,
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

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Seeds a session whose idToken is already expired per our own tracked `lila_expires_at` (in
// the past) but whose refreshToken is still good — the exact state a real user is in once their
// idToken's TTL runs out mid-conversation. The idToken itself must still decode as structurally
// valid with a future `exp` claim, or AuthContext's own mount-time `isTokenValid` check wipes
// the whole session before the app ever renders — that's a distinct concern from the one this
// test targets (authFetch's *reactive* refresh gap on `@Public()` endpoints).
async function seedExpiredSession(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    ({ idToken, accessToken, refreshToken }) => {
      localStorage.setItem("lila_id_token", idToken);
      localStorage.setItem("lila_access_token", accessToken);
      localStorage.setItem("lila_refresh_token", refreshToken);
      localStorage.setItem("lila_expires_at", String(Date.now() - 60_000));
      localStorage.removeItem("lila_user_count");
    },
    {
      idToken: fakeIdToken(),
      accessToken: "expired-access-token",
      refreshToken: "still-valid-refresh-token",
    },
  );
}

// Regression test for: an authenticated user whose idToken expires mid-conversation got a 404
// "No user or guest identifier provided" from /lila/chat, instead of authFetch transparently
// refreshing the session like it does for every other authenticated endpoint. Root cause:
// /lila/chat and /lila/agent/me are `@Public()` on the backend (they also serve guests) — when
// the Authorization header carries an expired/invalid token, the backend's guard doesn't reject
// with 401, it silently falls back to treating the caller as a guest. Since the authenticated
// branch never sends `x-guest-id`, the backend ends up with neither identifier and 404s.
// authFetch.ts only refreshed reactively on a 401, so it never noticed and kept resending the
// dead token to /lila/chat indefinitely. Fix: authFetch now also checks the token's own known
// expiry (`lila_expires_at`, already tracked on login/refresh) *before* the first attempt, and
// refreshes proactively — independent of which status code the target endpoint happens to
// answer with.
test.describe("authFetch — proactive refresh on expired idToken (Public chat endpoint)", () => {
  test("un idToken expirado se refresca antes de pegarle a /lila/chat, sin pasar por el 404 de 'no identifier'", async ({
    page,
  }) => {
    const chatAuthHeaders: (string | null)[] = [];
    let refreshCalls = 0;

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );

    await page.route(`${API_URL}/auth/refresh`, async (route) => {
      refreshCalls++;
      await fulfillJson(route, {
        accessToken: "fresh-access-token",
        idToken: "fresh-id-token",
        expiresIn: 3600,
      });
    });

    // Mirrors the real backend's actual behavior confirmed against the deployed ms-lila `dev`
    // stage: an authenticated call with an expired/invalid token gets the "no identifier" 404
    // (never a 401) on this `@Public()` route, since the FE never sends `x-guest-id` alongside
    // an Authorization header.
    await page.route(`${API_URL}/lila/chat`, async (route) => {
      const authHeader = route.request().headers()["authorization"] ?? null;
      chatAuthHeaders.push(authHeader);
      if (authHeader === "Bearer fresh-id-token") {
        await fulfillJson(route, {
          reply: "¡Hola de nuevo!",
          conversationId: "conv-1",
          tokensUsed: 12,
        });
        return;
      }
      await fulfillJson(
        route,
        {
          message: "No user or guest identifier provided",
          error: "Not Found",
          statusCode: 404,
        },
        404,
      );
    });

    await seedExpiredSession(page);
    await page.goto(`${BASE_URL}/chat`);

    const composer = page.getByPlaceholder("Escríbeme...");
    await composer.click();
    await composer.fill("Sigo aquí");
    await composer.press("Enter");

    await expect(page.getByTestId("message-bubble").last()).toContainText(
      "Hola de nuevo",
    );

    // No error banner ("HTTP 404: No user or guest identifier provided") should ever surface.
    await expect(page.locator(".bg-red-50")).toHaveCount(0);

    // The refresh must have happened exactly once (deduped), and the chat request must have
    // gone out already carrying the fresh token on its FIRST attempt — not needed a second,
    // separate message to "get lucky" off some other endpoint's 401.
    expect(refreshCalls).toBe(1);
    expect(chatAuthHeaders).toEqual(["Bearer fresh-id-token"]);
  });
});
