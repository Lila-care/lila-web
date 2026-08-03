import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";
const AUTH_DOMAIN =
  process.env.VITE_AUTH_DOMAIN ??
  "https://lila-app-dev.auth.us-east-1.amazoncognito.com";

// Regression test for: the OAuth code exchange effect in AuthCallback.tsx used to run more
// than once per authorization code (React.StrictMode double-invoke in dev, plus `login`/
// `navigate` being new function references on every render). Cognito's authorization code is
// single-use, so the 2nd/3rd POST /oauth2/token failed with `invalid_grant`, which briefly
// flashed the "Error al iniciar sesión" card before the winning request resolved and navigated
// to /chat. Fix: a useRef guard makes the exchange run exactly once per mount.
test.describe("AuthCallback — token exchange runs once per code (StrictMode safe)", () => {
  test("solo dispara un POST /oauth2/token y nunca muestra la card de error", async ({
    page,
  }) => {
    let tokenExchangeCount = 0;

    await page.route(`${AUTH_DOMAIN}/oauth2/token`, async (route) => {
      tokenExchangeCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id_token: fakeIdToken(),
          access_token: "fake-access-token",
          refresh_token: "fake-refresh-token",
          expires_in: 3600,
        }),
      });
    });

    await page.route(`${API_URL}/lila/guest/migrate`, (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Guest not found" }),
      }),
    );

    await page.goto(`${BASE_URL}/auth/callback?code=e2e-fake-auth-code`);

    await page.waitForURL(`${BASE_URL}/chat`);

    // The error card must never have appeared, even transiently — checked after settling on
    // /chat so a card that flashed and was replaced wouldn't be missed.
    await expect(page.getByText("Error al iniciar sesión")).toHaveCount(0);

    expect(tokenExchangeCount).toBe(1);
  });
});

function fakeIdToken(): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "e2e-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "e2e@lila.app",
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}
