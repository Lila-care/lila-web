import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";
const AUTH_DOMAIN =
  process.env.VITE_AUTH_DOMAIN ??
  "https://lila-app-dev.auth.us-east-1.amazoncognito.com";
const CLIENT_ID = process.env.VITE_CLIENT_ID ?? "e2e-test-client-id";

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

// Regression test for two bugs reported together in staging:
//   1. UserLogin.tsx (/login) built its /oauth2/authorize redirect using the env var
//      VITE_COGNITO_CLIENT_ID, while AuthCallback.tsx (the single handler for
//      /auth/callback, shared by /login and /admin) always exchanged the code using
//      VITE_CLIENT_ID. In staging only VITE_CLIENT_ID was kept up to date, so the
//      authorize request and the token exchange disagreed on client_id and Cognito
//      rejected the exchange for every normal-user login. Fix: UserLogin.tsx now reads
//      VITE_CLIENT_ID too, the same var Admin/Login.tsx already used.
//   2. The error branch's "Volver al inicio" link was hardcoded to /admin. Combined with
//      bug 1, every failed /login attempt sent the user to the ADMIN login instead of back
//      to the public one. Fix: the origin (/login or /admin) is now stashed in
//      sessionStorage right before the redirect to Cognito and read back in AuthCallback.
test.describe("AuthCallback — vuelve al origen correcto tras un login fallido", () => {
  test("originado en /login: el authorize request usa VITE_CLIENT_ID y el link de error vuelve a /login", async ({
    page,
  }) => {
    await page.route(`${AUTH_DOMAIN}/oauth2/authorize**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html></html>",
      }),
    );

    await page.goto(`${BASE_URL}/login`);
    await page.getByText("Continuar con Google").click();
    await page.waitForURL(`${AUTH_DOMAIN}/oauth2/authorize**`);

    const authorizeUrl = new URL(page.url());
    expect(authorizeUrl.searchParams.get("client_id")).toBe(CLIENT_ID);

    await page.route(`${AUTH_DOMAIN}/oauth2/token`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant" }),
      }),
    );

    await page.goto(`${BASE_URL}/auth/callback?code=e2e-fake-auth-code-login`);

    await expect(page.getByText("Error al iniciar sesión")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Volver al inicio" }),
    ).toHaveAttribute("href", "/login");
  });

  test("no-regresión — originado en /admin: el link de error sigue apuntando a /admin", async ({
    page,
  }) => {
    await page.route(`${AUTH_DOMAIN}/oauth2/authorize**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html></html>",
      }),
    );

    await page.goto(`${BASE_URL}/admin`);
    await page.getByText("Continuar con Google").click();
    await page.waitForURL(`${AUTH_DOMAIN}/oauth2/authorize**`);

    await page.route(`${AUTH_DOMAIN}/oauth2/token`, (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant" }),
      }),
    );

    await page.goto(`${BASE_URL}/auth/callback?code=e2e-fake-auth-code-admin`);

    await expect(page.getByText("Error al iniciar sesión")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Volver al inicio" }),
    ).toHaveAttribute("href", "/admin");
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
