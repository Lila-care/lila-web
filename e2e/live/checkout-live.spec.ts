import { test as base, expect, type Page } from "@playwright/test";
import { LIVE_SESSION_ENV } from "./global-setup";

// KAN-62 — /checkout against the REAL dev backend and Wompi sandbox. Opt-in: only the `live`
// Playwright project runs this (`npx playwright test --project=live`), never the default run or
// CI. See .env.e2e.example for the variables.
//
// Safety rules: credentials come ONLY from the environment (E2E_USER_EMAIL / E2E_USER_PASSWORD),
// nothing here logs or prints tokens or the password (the `live` project also runs with
// trace/screenshot/video off), and no test completes a payment or changes the account.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = (process.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const EMAIL = process.env.E2E_USER_EMAIL;
const PASSWORD = process.env.E2E_USER_PASSWORD;
const HAS_WOMPI_SANDBOX_KEY = Boolean(process.env.VITE_WOMPI_PUBLIC_KEY);
// Optional: pin the plan when dev has more than one paid plan (/checkout needs ?planId= then).
const PLAN_ID = process.env.E2E_PLAN_ID;

// Same keys as src/auth/AuthContext.tsx (TOKEN_KEY, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY,
// EXPIRES_AT_KEY). Duplicated on purpose: specs must not import from `src/` (Vite aliases).
const TOKEN_KEY = "lila_id_token";
const ACCESS_TOKEN_KEY = "lila_access_token";
const REFRESH_TOKEN_KEY = "lila_refresh_token";
const EXPIRES_AT_KEY = "lila_expires_at";

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

const MISSING_ENV_MESSAGE =
  "Live e2e skipped: set E2E_USER_EMAIL, E2E_USER_PASSWORD and VITE_API_URL (see .env.e2e.example)";
const isConfigured = Boolean(EMAIL && PASSWORD && API_URL);

// The login happens once in ./global-setup.ts (see there why) and reaches the workers through the
// environment. Tokens are handed to the browser as in-memory storageState: no auth file on disk.
function readSession(): AuthTokens {
  const raw = process.env[LIVE_SESSION_ENV];
  if (!raw) {
    throw new Error(
      "Live session missing: run through the `live` Playwright project so global-setup can log in",
    );
  }
  return JSON.parse(raw) as AuthTokens;
}

const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  storageState: async ({}, provide) => {
    const tokens = readSession();
    await provide({
      cookies: [],
      origins: [
        {
          origin: new URL(BASE_URL).origin,
          localStorage: [
            { name: TOKEN_KEY, value: tokens.idToken },
            { name: ACCESS_TOKEN_KEY, value: tokens.accessToken },
            { name: REFRESH_TOKEN_KEY, value: tokens.refreshToken },
            {
              name: EXPIRES_AT_KEY,
              value: String(Date.now() + tokens.expiresIn * 1000),
            },
          ],
        },
      ],
    });
  },
});

function parseCop(text: string | null): number {
  return Number((text ?? "").replace(/\D/g, ""));
}

async function openCheckout(page: Page) {
  const plansResponse = page.waitForResponse((response) =>
    response.url().startsWith(`${API_URL}/subscription/plans`),
  );
  await page.goto(`${BASE_URL}/checkout${PLAN_ID ? `?planId=${PLAN_ID}` : ""}`);
  try {
    await plansResponse;
  } catch {
    throw new Error(
      `The app never called ${API_URL}/subscription/plans: is the dev server running against the dev API (VITE_API_URL)?`,
    );
  }
  await expect(page.getByTestId("plan-summary")).toBeVisible();
}

// The Wompi widget opens as an overlay made of an <iframe> injected by checkout.wompi.co's
// script; this page has no other iframes.
function wompiOverlay(page: Page) {
  return page.locator("iframe").first();
}

test.describe("Checkout live (dev backend + Wompi sandbox)", () => {
  test.skip(!isConfigured, MISSING_ENV_MESSAGE);

  test("carga el plan real de dev y muestra un total mayor a 0", async ({
    page,
  }) => {
    await openCheckout(page);

    const total = parseCop(await page.getByTestId("payment-total").textContent());
    expect(total).toBeGreaterThan(0);
    await expect(page.getByTestId("pay-button")).toContainText("Pagar");
  });

  test("un código inexistente muestra Inválido o 'servicio no disponible' y no bloquea Pagar", async ({
    page,
  }) => {
    await openCheckout(page);
    const totalBefore = await page.getByTestId("payment-total").textContent();

    await page.getByLabel("Código de descuento").fill("E2E-NO-SUCH-CODE");
    await page.getByTestId("code-action").click();

    const feedback = page.getByTestId("code-feedback");
    await expect(feedback).toBeVisible();
    // TODO(KAN-64): once `checkout-quote` is deployed in dev, only "invalid" is expected. Until
    // then the endpoint answers 404 and the field reports "unavailable" — both are acceptable.
    await expect(feedback).toHaveAttribute("data-status", /^(invalid|unavailable)$/);

    // The refused code doesn't change the total, and Pagar charges without it.
    await expect(page.getByTestId("payment-total")).toHaveText(totalBefore ?? "");
    await expect(page.getByTestId("pay-without-code-note")).toBeVisible();
    await expect(page.getByTestId("pay-button")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("375px: sin desbordamiento horizontal con datos reales", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openCheckout(page);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test.describe("con Wompi sandbox", () => {
    test.skip(
      !HAS_WOMPI_SANDBOX_KEY,
      "Skipped: set VITE_WOMPI_PUBLIC_KEY (Wompi sandbox public key) to open the real widget",
    );

    test("sin código, Pagar abre el widget real de Wompi (sin completar el pago)", async ({
      page,
    }) => {
      await openCheckout(page);

      await page.getByTestId("pay-button").click();

      // Real quote (or the legacy signature while KAN-64 isn't in dev) + real widget script.
      await expect(wompiOverlay(page)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("pay-button")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      // Deliberately stops here: the context is closed without paying.
    });

    test("tras un código inexistente, Pagar sigue abriendo el widget (sin código)", async ({
      page,
    }) => {
      await openCheckout(page);
      await page.getByLabel("Código de descuento").fill("E2E-NO-SUCH-CODE");
      await page.getByTestId("code-action").click();
      await expect(page.getByTestId("code-feedback")).toBeVisible();

      await page.getByTestId("pay-button").click();

      await expect(wompiOverlay(page)).toBeVisible({ timeout: 30_000 });
    });
  });
});
