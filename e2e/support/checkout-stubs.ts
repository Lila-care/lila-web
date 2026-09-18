import { expect, type Page, type Route } from "@playwright/test";

// KAN-62 — /checkout: plan summary + discount code + Wompi payment.
// KAN-64 (checkout-quote) is not merged yet, so its contract is stubbed with `page.route`, and
// Wompi's `window.WidgetCheckout` is replaced by a stub that records what it was opened with.

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
export const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";
export const AUTH_DOMAIN =
  process.env.VITE_AUTH_DOMAIN ??
  "https://lila-app-dev.auth.us-east-1.amazoncognito.com";

export const LIST_AMOUNT_IN_CENTS = 1990000;
export const LILA20_AMOUNT_IN_CENTS = 1592000;
export const LILA20_DISCOUNT_IN_CENTS = 398000;
export const ID_TOKEN_KEY = "lila_id_token";
export const POST_LOGIN_REDIRECT_KEY = "lila_post_login_redirect";

export const PREMIUM_PLAN = {
  planId: "plan-premium",
  name: "Premium Mensual",
  amountInCents: LIST_AMOUNT_IN_CENTS,
  currency: "COP",
  intervalDays: 30,
  status: "active",
  description: "Conversa con Lila sin límites.",
  maxInteractionsPerDay: null,
};

export const FREE_PLAN = {
  planId: "plan-free",
  name: "Gratis",
  amountInCents: 0,
  currency: "COP",
  intervalDays: null,
  status: "active",
  maxInteractionsPerDay: 10,
};

export interface QuoteRequest {
  planId: string;
  code?: string;
}

export interface MockResponse {
  status: number;
  body: unknown;
}

export type QuoteHandler = (request: QuoteRequest, callCount: number) => MockResponse;

export interface WidgetCall {
  params: {
    currency: string;
    amountInCents: number;
    reference: string;
    publicKey: string;
    signature: { integrity: string };
  };
}

export interface WompiTestWindow extends Window {
  __wompiCalls: WidgetCall[];
  __wompiCallback: ((result: unknown) => void) | null;
}

export function fakeIdToken(): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "valentina@lila.app",
    name: "Valentina",
  };
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fakesignature`;
}

export function respondOk(body: unknown): MockResponse {
  return { status: 200, body };
}

export function quoteBody(
  callCount: number,
  amountInCents: number,
  discountInCents: number,
  code: string | null,
) {
  return {
    planId: PREMIUM_PLAN.planId,
    reference: `ref-${callCount}`,
    currency: "COP",
    listAmountInCents: LIST_AMOUNT_IN_CENTS,
    discountInCents,
    amountInCents,
    signature: `sig-${callCount}`,
    discount: code ? { discountId: "disc-1", kind: "percentage", code } : null,
  };
}

export function reject(reason: string): MockResponse {
  return {
    status: 422,
    body: { statusCode: 422, message: `Rejected: ${reason}`, reason },
  };
}

export const defaultQuoteHandler: QuoteHandler = ({ code }, callCount) => {
  if (!code) {
    return respondOk(quoteBody(callCount, LIST_AMOUNT_IN_CENTS, 0, null));
  }
  switch (code) {
    case "LILA20":
      return respondOk(
        quoteBody(
          callCount,
          LILA20_AMOUNT_IN_CENTS,
          LILA20_DISCOUNT_IN_CENTS,
          code,
        ),
      );
    case "EXPIRED1":
      return reject("DISCOUNT_EXPIRED");
    case "TINY":
      return reject("AMOUNT_BELOW_MINIMUM");
    default:
      return reject("DISCOUNT_NOT_FOUND");
  }
};

export interface ApiMockOptions {
  plans?: unknown[];
  plansStatus?: number;
  plansGate?: Promise<void>;
  quote?: QuoteHandler;
  // Holds a quote response until the returned promise resolves (`callCount` is 1-based).
  quoteGate?: (callCount: number) => Promise<void> | undefined;
  confirmStatus?: number;
}

export interface ApiMock {
  quoteBodies: QuoteRequest[];
  confirmBodies: unknown[];
  signatureQueries: URLSearchParams[];
  options: ApiMockOptions;
}

export async function fulfillJson(route: Route, { status, body }: MockResponse) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockCheckoutApi(
  page: Page,
  options: ApiMockOptions = {},
): Promise<ApiMock> {
  const mock: ApiMock = {
    quoteBodies: [],
    confirmBodies: [],
    signatureQueries: [],
    options,
  };

  await page.route(`${API_URL}/subscription/plans`, async (route) => {
    await mock.options.plansGate;
    await fulfillJson(route, {
      status: mock.options.plansStatus ?? 200,
      body: mock.options.plans ?? [FREE_PLAN, PREMIUM_PLAN],
    });
  });

  await page.route(`${API_URL}/subscription/checkout-quote`, async (route) => {
    const request = route.request().postDataJSON() as QuoteRequest;
    mock.quoteBodies.push(request);
    const callCount = mock.quoteBodies.length;
    await mock.options.quoteGate?.(callCount);
    const handler = mock.options.quote ?? defaultQuoteHandler;
    await fulfillJson(route, handler(request, callCount));
  });

  await page.route(
    `${API_URL}/subscription/checkout-signature*`,
    async (route) => {
      mock.signatureQueries.push(new URL(route.request().url()).searchParams);
      await fulfillJson(route, respondOk({ signature: "legacy-sig" }));
    },
  );

  await page.route(
    `${API_URL}/subscription/confirm-widget-payment`,
    async (route) => {
      mock.confirmBodies.push(route.request().postDataJSON());
      await fulfillJson(route, {
        status: mock.options.confirmStatus ?? 201,
        body: {},
      });
    },
  );

  // Any accidental real widget script request must never reach the network.
  await page.route("https://checkout.wompi.co/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );

  return mock;
}

export async function installWidgetStub(page: Page) {
  await page.addInitScript(() => {
    const testWindow = window as unknown as WompiTestWindow;
    testWindow.__wompiCalls = [];
    testWindow.__wompiCallback = null;
    (testWindow as unknown as { WidgetCheckout: unknown }).WidgetCheckout = class {
      params: WidgetCall["params"];
      constructor(params: WidgetCall["params"]) {
        this.params = params;
      }
      open(onResult: (result: unknown) => void) {
        testWindow.__wompiCalls.push({ params: this.params });
        testWindow.__wompiCallback = onResult;
      }
    };
  });
}

export async function widgetCalls(page: Page): Promise<WidgetCall[]> {
  return page.evaluate(
    () => (window as unknown as WompiTestWindow).__wompiCalls,
  );
}

export async function emitWidgetResult(page: Page, result: unknown) {
  await page.evaluate((payload) => {
    const callback = (window as unknown as WompiTestWindow).__wompiCallback;
    if (!callback) throw new Error("Widget was never opened");
    callback(payload);
  }, result);
}

export async function seedSession(page: Page) {
  await page.addInitScript(
    ([key, token]) => localStorage.setItem(key, token),
    [ID_TOKEN_KEY, fakeIdToken()],
  );
}

// Authenticated session + API stubs + widget stub, then opens /checkout.
export async function openCheckout(
  page: Page,
  options: ApiMockOptions = {},
  path = "/checkout",
): Promise<ApiMock> {
  await seedSession(page);
  await installWidgetStub(page);
  const mock = await mockCheckoutApi(page, options);
  await page.goto(`${BASE_URL}${path}`);
  return mock;
}

export async function waitForReady(page: Page) {
  await expect(page.getByTestId("plan-summary")).toBeVisible();
}

export async function applyCode(page: Page, code: string) {
  await page.getByLabel("Código de descuento").fill(code);
  await page.getByTestId("code-action").click();
}

export async function clickPay(page: Page) {
  await page.getByTestId("pay-button").click();
}

export async function expectWidgetOpened(page: Page, times: number) {
  await expect.poll(async () => (await widgetCalls(page)).length).toBe(times);
}

// A promise that resolves when `open()` is called: lets a test hold a stubbed response.
export function createGate() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

const LOGIN_ORIGIN_KEY = "lila_login_origin";

// Lands on /auth/callback as if Cognito had just redirected back, with the token exchange
// stubbed. `storedRedirect` is what a guest at /checkout left in sessionStorage; `loginOrigin`
// is what the login screen recorded (`/login` = public flow, `/admin` = admin flow).
export async function completeLoginCallback(
  page: Page,
  storedRedirect: string,
  loginOrigin?: string,
) {
  await page.addInitScript(
    ([redirectKey, redirect, originKey, origin]) => {
      sessionStorage.setItem(redirectKey, redirect);
      if (origin) sessionStorage.setItem(originKey, origin);
    },
    [POST_LOGIN_REDIRECT_KEY, storedRedirect, LOGIN_ORIGIN_KEY, loginOrigin ?? ""],
  );
  await page.route(`${AUTH_DOMAIN}/oauth2/token`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id_token: fakeIdToken(),
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        expires_in: 3600,
      }),
    }),
  );
  await page.goto(`${BASE_URL}/auth/callback?code=e2e-fake-auth-code`);
}
