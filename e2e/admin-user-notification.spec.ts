import { test, expect, type Page, type Route } from "@playwright/test";
import {
  API_URL,
  BASE_URL,
  fulfillJson,
  seedSession,
  ADMIN_ROLES,
} from "./support/learnMocks";
import type { BroadcastResult } from "../src/api/notifications";

// Single-user sender in the Usuarias detail panel. Everything is mocked with page.route —
// nothing here sends a real notification.
const BROADCAST_URL = `${API_URL}/admin/notifications/broadcast`;
const isUsersList = (url: URL) => url.pathname === "/admin/dashboard/users";
const isUserDetail = (url: URL) =>
  /^\/admin\/dashboard\/users\/(?!recent$|attention$)[^/]+$/.test(url.pathname);

function buildUser(userId: string, email: string) {
  return {
    userId,
    email,
    createdAt: "2026-09-12T15:00:00.000Z",
    accountStatus: "confirmed",
    provider: "password",
    stage: "onboarding_completed",
    onboarding: null,
    conversations: 2,
    cycleReports: 1,
    lastActivityAt: new Date().toISOString(),
    subscriptionStatus: "none",
    checkoutAttempts: 0,
    attentionReason: null,
  };
}

function buildDetail(userId: string, email: string) {
  return {
    ...buildUser(userId, email),
    tiers: [],
    timeline: [],
    stoppedAt: null,
    summary: {
      conversations: 2,
      cycleReports: 1,
      plan: null,
      subscriptionStatus: "none",
      lastPayment: null,
    },
  };
}

function buildResult(overrides: Partial<BroadcastResult> = {}): BroadcastResult {
  return {
    dryRun: true,
    recipients: { users: 1, devices: 1 },
    skipped: { categoryOff: 0, quietHours: 0, notLocalHour: 0, total: 0 },
    sent: 0,
    failed: 0,
    removed: 0,
    aborted: false,
    ...overrides,
  };
}

const USERS = [
  buildUser("sub-ana", "ana@example.com"),
  buildUser("sub-bea", "bea@example.com"),
];

async function mockApi(
  page: Page,
  respond: (body: Record<string, unknown>, route: Route) => Promise<void>,
) {
  const calls: Record<string, unknown>[] = [];
  await page.route(isUsersList, (route) =>
    fulfillJson(route, {
      data: USERS,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
  );
  await page.route(isUserDetail, (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop()!;
    const user = USERS.find((u) => u.userId === id)!;
    return fulfillJson(route, buildDetail(user.userId, user.email));
  });
  await page.route(BROADCAST_URL, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    calls.push(body);
    await respond(body, route);
  });
  return calls;
}

async function openUser(page: Page, userId = "sub-ana") {
  await seedSession(page, ADMIN_ROLES);
  await page.goto(`${BASE_URL}/admin/users?user=${userId}`);
  await expect(page.getByTestId("user-notify")).toBeVisible();
}

async function fillMessage(page: Page) {
  await page.getByTestId("user-notify-title").fill("Hola");
  await page.getByTestId("user-notify-body").fill("Mensaje de prueba");
}

test.describe("Admin user detail — send notification", () => {
  test("simulate with 1 device targets only this user and unlocks the real send", async ({
    page,
  }) => {
    const calls = await mockApi(page, (body, route) =>
      fulfillJson(
        route,
        body.dryRun ? buildResult() : buildResult({ dryRun: false, sent: 1 }),
      ),
    );
    await openUser(page);
    await expect(page.getByTestId("user-notify-category")).toHaveValue("news");
    await expect(page.getByTestId("user-notify-send")).toBeDisabled();

    await fillMessage(page);
    await page.getByTestId("user-notify-simulate").click();
    await expect(page.getByTestId("user-notify-reach")).toHaveText(
      "Le llegaría en 1 dispositivo.",
    );
    expect(calls).toEqual([
      {
        title: "Hola",
        body: "Mensaje de prueba",
        category: "news",
        dryRun: true,
        allowlistUserIds: ["sub-ana"],
      },
    ]);

    await page.getByTestId("user-notify-send").click();
    const dialog = page.getByTestId("notifications-confirm-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("confirm-recipient")).toHaveText(
      "ana@example.com",
    );
    await expect(page.getByTestId("confirm-preview")).toContainText(
      "Mensaje de prueba",
    );
    await page.getByTestId("confirm-send").click();
    await expect(page.getByTestId("user-notify-outcome")).toContainText(
      "Enviadas: 1 · Fallidas: 0",
    );
    expect(calls[1]).toMatchObject({
      dryRun: false,
      allowlistUserIds: ["sub-ana"],
    });
    // The user panel survives the nested dialog, and one simulation unlocks one send.
    await expect(page.getByTestId("user-panel")).toBeVisible();
    await expect(page.getByTestId("user-notify-send")).toBeDisabled();
  });

  test("Escape closes only the confirmation, not the panel", async ({ page }) => {
    await mockApi(page, (_b, route) => fulfillJson(route, buildResult()));
    await openUser(page);
    await fillMessage(page);
    await page.getByTestId("user-notify-simulate").click();
    await page.getByTestId("user-notify-send").click();
    await expect(page.getByTestId("notifications-confirm-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("notifications-confirm-dialog")).toBeHidden();
    await expect(page.getByTestId("user-panel")).toBeVisible();
  });

  test("0 devices says there is no registered device and blocks the real send", async ({
    page,
  }) => {
    await mockApi(page, (_b, route) =>
      fulfillJson(
        route,
        buildResult({ recipients: { users: 0, devices: 0 } }),
      ),
    );
    await openUser(page);
    await fillMessage(page);
    await page.getByTestId("user-notify-simulate").click();
    await expect(page.getByTestId("user-notify-reach")).toHaveText(
      "Esta usuaria aún no tiene un dispositivo registrado.",
    );
    await expect(page.getByTestId("user-notify-send")).toBeDisabled();
  });

  for (const [skipped, expected] of [
    [{ categoryOff: 1, total: 1 }, "tiene apagada esta categoría"],
    [{ quietHours: 1, total: 1 }, "horario de silencio"],
  ] as const) {
    test(`skipped reason is explained: ${expected}`, async ({ page }) => {
      await mockApi(page, (_b, route) =>
        fulfillJson(
          route,
          buildResult({
            recipients: { users: 0, devices: 0 },
            skipped: {
              categoryOff: 0,
              quietHours: 0,
              notLocalHour: 0,
              total: 0,
              ...skipped,
            },
          }),
        ),
      );
      await openUser(page);
      await fillMessage(page);
      await page.getByTestId("user-notify-simulate").click();
      await expect(page.getByTestId("user-notify-reach")).toContainText(expected);
      await expect(page.getByTestId("user-notify-send")).toBeDisabled();
    });
  }

  test("editing after simulating invalidates it", async ({ page }) => {
    await mockApi(page, (_b, route) => fulfillJson(route, buildResult()));
    await openUser(page);
    await fillMessage(page);
    await page.getByTestId("user-notify-simulate").click();
    await expect(page.getByTestId("user-notify-send")).toBeEnabled();
    await page.getByTestId("user-notify-body").fill("Otro");
    await expect(page.getByTestId("user-notify-send")).toBeDisabled();
    await expect(page.getByTestId("user-notify-reach")).toContainText(
      "volvé a simular",
    );
  });

  test("switching to another user clears the form and the simulation", async ({
    page,
  }) => {
    await mockApi(page, (_b, route) => fulfillJson(route, buildResult()));
    await openUser(page);
    await fillMessage(page);
    await page.getByTestId("user-notify-simulate").click();
    await expect(page.getByTestId("user-notify-send")).toBeEnabled();

    await page.getByTestId("user-row").nth(1).getByRole("link").click();
    await expect(page).toHaveURL(/user=sub-bea/);
    await expect(page.getByTestId("user-notify")).toBeVisible();
    await expect(page.getByTestId("user-notify-body")).toHaveValue("");
    await expect(page.getByTestId("user-notify-reach")).toBeHidden();
    await expect(page.getByTestId("user-notify-send")).toBeDisabled();
  });

  for (const [status, expected] of [
    [403, "No tenés permiso"],
    [400, "Revisá los datos"],
    [422, "Revisá los datos"],
  ] as const) {
    test(`HTTP ${status} shows Spanish copy`, async ({ page }) => {
      await mockApi(page, (_b, route) =>
        fulfillJson(route, { message: "x" }, status),
      );
      await openUser(page);
      await fillMessage(page);
      await page.getByTestId("user-notify-simulate").click();
      await expect(page.getByTestId("user-notify-error")).toContainText(expected);
      await expect(page.getByTestId("user-notify-send")).toBeDisabled();
    });
  }

  test("404 shows the endpoint-not-deployed notice", async ({ page }) => {
    await mockApi(page, (_b, route) => fulfillJson(route, { message: "x" }, 404));
    await openUser(page);
    await fillMessage(page);
    await page.getByTestId("user-notify-simulate").click();
    await expect(page.getByTestId("user-notify-unavailable")).toContainText(
      "todavía no está disponible",
    );
    await expect(page.getByTestId("user-notify-send")).toBeDisabled();
  });
});
