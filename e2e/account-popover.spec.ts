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

// Builds an unsigned JWT-shaped token (header.payload.signature) — the app only base64-decodes
// the payload client-side, it never verifies the signature, so a fake signature is enough.
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

async function mockAuthenticatedShell(page: Page) {
  await page.route(`${API_URL}/lila/config`, (route) =>
    fulfillJson(route, CONFIG_BODY),
  );
  await page.route(`${API_URL}/lila/agent/me`, (route) =>
    fulfillJson(route, AGENT_ME_BODY),
  );
  await page.route(`${API_URL}/lila/conversations`, (route) =>
    fulfillJson(route, []),
  );
}

// Regression test for KAN-58: the user popover (Sidebar.tsx) was not usable by keyboard or
// screen reader — no role, no aria-label on the trigger, no aria-expanded/aria-haspopup, no
// focus management on open/close, and Esc did not close it. Fix moves focus into the popover
// on open, adds role="menu"/"menuitem" + aria-label/aria-haspopup/aria-expanded to the trigger,
// closes on Esc, and returns focus to the trigger afterwards.
test.describe("Sidebar — popover de cuenta accesible por teclado", () => {
  test("el trigger anuncia rol, nombre y estado expandido", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/chat`);

    const trigger = page.getByTestId("user-avatar-trigger");
    await expect(trigger).toHaveAttribute("aria-label", "Menú de cuenta");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("abrir el popover mueve el foco al primer item e informa role=menu", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/chat`);

    const trigger = page.getByTestId("user-avatar-trigger");
    await trigger.click();

    const popover = page.getByTestId("user-popover");
    await expect(popover).toBeVisible();
    await expect(popover).toHaveAttribute("role", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    const firstItem = popover.getByRole("menuitem", { name: "Mi Perfil" });
    await expect(firstItem).toBeFocused();
  });

  test("Esc cierra el popover y devuelve el foco al avatar", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/chat`);

    const trigger = page.getByTestId("user-avatar-trigger");
    await trigger.click();
    await expect(page.getByTestId("user-popover")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByTestId("user-popover")).toHaveCount(0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });

  // Regression test for KAN-58 follow-up: EmptyState.tsx's header/main/composer wrapper all set
  // "relative z-10" and, because Sidebar's <aside> uses position:sticky (which always opens its
  // own stacking context), that z-10 outranked the popover's own z-index — the popover rendered
  // fully behind the chat content, and its items couldn't be clicked even though they passed
  // toBeVisible(). Fix: elevate the <aside> itself to z-20 so the whole sidebar — popover
  // included — paints above EmptyState's z-10 layer, not just the popover's local z-index.
  test("el popover no queda oculto detrás del EmptyState del chat", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/chat`);
    await expect(page.getByTestId("empty-state")).toBeVisible();

    const trigger = page.getByTestId("user-avatar-trigger");
    await trigger.click();

    const popover = page.getByTestId("user-popover");
    await expect(popover).toBeVisible();

    // .click() runs Playwright's actionability checks (including "receives pointer events" via
    // elementFromPoint) — it fails/times out if something else visually covers the target, which
    // toBeVisible() alone does not catch.
    await popover.getByRole("menuitem", { name: "Mi Perfil" }).click();
    await page.waitForURL(`${BASE_URL}/perfil`);
  });
});
