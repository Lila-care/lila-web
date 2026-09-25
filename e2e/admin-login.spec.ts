import { test, expect, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Standard base64 (not base64url): AuthContext decodes the payload with plain `atob`.
function fakeIdToken(): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64");
  const payload = {
    sub: "admin-e2e",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "admin@lila.app",
  };
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fakesignature`;
}

// Regression: after a successful password login the panel bounced straight back to the
// /admin login form. wouter's navigate re-rendered ProtectedRoute before AuthContext had
// committed the new token, so it redirected as if logged out.
test("login con contraseña en /admin aterriza en el dashboard y no rebota al login", async ({
  page,
}) => {
  await page.route(`${API_URL}/auth/login`, (route) =>
    fulfillJson(route, {
      idToken: fakeIdToken(),
      accessToken: "fake-access-token",
      refreshToken: "fake-refresh-token",
      expiresIn: 3600,
    }),
  );
  // The dashboard's own data calls — answered so none reaches the network.
  await page.route(`${API_URL}/admin/dashboard/**`, (route) =>
    fulfillJson(route, {}),
  );

  await page.goto(`${BASE_URL}/admin`);
  await page.getByTestId("login-email").fill("admin@lila.app");
  await page.getByTestId("login-password").fill("not-a-real-password");
  await page.getByTestId("login-submit").click();

  await page.waitForURL(`${BASE_URL}/admin/dashboard`);
  await expect(page.getByTestId("login-form")).toHaveCount(0);
  await expect(page).toHaveURL(`${BASE_URL}/admin/dashboard`);
});
