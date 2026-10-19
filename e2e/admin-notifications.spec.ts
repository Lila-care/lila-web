import { test, expect, type Page, type Route } from "@playwright/test";
import {
  API_URL,
  BASE_URL,
  fulfillJson,
  seedSession,
  ADMIN_ROLES,
} from "./support/learnMocks";
import type { BroadcastResult } from "../src/api/notifications";

// Every call to ms-lila is mocked with page.route — nothing here sends a real notification.
const BROADCAST_URL = `${API_URL}/admin/notifications/broadcast`;

function buildResult(overrides: Partial<BroadcastResult> = {}): BroadcastResult {
  return {
    dryRun: true,
    recipients: { users: 3, devices: 4 },
    skipped: { categoryOff: 2, quietHours: 1, notLocalHour: 5, total: 8 },
    sent: 0,
    failed: 0,
    removed: 0,
    aborted: false,
    ...overrides,
  };
}

interface Broadcast {
  calls: Record<string, unknown>[];
}

// Answers every POST with `respond(body)`; records the parsed bodies.
async function mockBroadcast(
  page: Page,
  respond: (body: Record<string, unknown>, route: Route) => Promise<void>,
): Promise<Broadcast> {
  const broadcast: Broadcast = { calls: [] };
  await page.route(BROADCAST_URL, async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    broadcast.calls.push(body);
    await respond(body, route);
  });
  return broadcast;
}

const happyPath = (body: Record<string, unknown>, route: Route) =>
  fulfillJson(
    route,
    body.dryRun
      ? buildResult()
      : buildResult({ dryRun: false, sent: 4, failed: 0, removed: 1 }),
  );

async function openPage(page: Page) {
  await seedSession(page, ADMIN_ROLES);
  await page.goto(`${BASE_URL}/admin/notifications`);
  await expect(page.getByRole("heading", { name: "Notificaciones" })).toBeVisible();
}

async function fillForm(page: Page, allowlist = "sub-1\nsub-2\nsub-1") {
  await page.getByTestId("notif-title").fill("Hola");
  await page.getByTestId("notif-body").fill("Tu ciclo empieza pronto");
  await page.getByTestId("notif-category").selectOption("cycle");
  if (allowlist) await page.getByTestId("notif-allowlist").fill(allowlist);
}

test.describe("Admin notifications broadcast", () => {
  test("sidebar has Notificaciones and navigates to the page", async ({ page }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.goto(`${BASE_URL}/admin/plans`);
    await page
      .getByTestId("admin-sidebar")
      .getByRole("link", { name: "Notificaciones" })
      .click();
    await expect(page).toHaveURL(/\/admin\/notifications$/);
  });

  test("category select lists the five Spanish labels", async ({ page }) => {
    await openPage(page);
    const labels = await page
      .getByTestId("notif-category")
      .locator("option")
      .allTextContents();
    expect(labels).toEqual([
      "Tu ciclo",
      "Periodo y predicciones",
      "Recordatorio diario",
      "Novedades",
      "Mi plan y pagos",
    ]);
  });

  test("counters follow the text and limits are enforced", async ({ page }) => {
    await openPage(page);
    await page.getByTestId("notif-title").fill("x".repeat(40));
    await expect(page.getByTestId("notif-title")).toHaveValue("x".repeat(35));
    await expect(page.getByText("35/35")).toBeVisible();
    await page.getByTestId("notif-body").fill("hola");
    await expect(page.getByText("4/100")).toBeVisible();
  });

  test("simulate sends dryRun:true and shows the reach; real send stays locked until then", async ({
    page,
  }) => {
    const broadcast = await mockBroadcast(page, happyPath);
    await openPage(page);
    await fillForm(page);

    await expect(page.getByTestId("notifications-send")).toBeDisabled();
    await page.getByTestId("notifications-simulate").click();

    await expect(page.getByTestId("sim-users")).toHaveText("3");
    await expect(page.getByTestId("sim-devices")).toHaveText("4");
    await expect(page.getByTestId("sim-category-off")).toHaveText("2");
    await expect(page.getByTestId("sim-quiet-hours")).toHaveText("1");
    await expect(page.getByTestId("sim-not-local-hour")).toHaveText("5");
    expect(broadcast.calls).toEqual([
      {
        title: "Hola",
        body: "Tu ciclo empieza pronto",
        category: "cycle",
        dryRun: true,
        allowlistUserIds: ["sub-1", "sub-2"],
      },
    ]);
    await expect(page.getByTestId("notifications-send")).toBeEnabled();
  });

  test("editing the data after simulating locks the real send again", async ({
    page,
  }) => {
    await mockBroadcast(page, happyPath);
    await openPage(page);
    await fillForm(page);
    await page.getByTestId("notifications-simulate").click();
    await expect(page.getByTestId("notifications-send")).toBeEnabled();

    await page.getByTestId("notif-body").fill("Otro texto");
    await expect(page.getByTestId("notifications-send")).toBeDisabled();
    await expect(page.getByTestId("notifications-simulation-stale")).toBeVisible();
  });

  test("without an allowlist the real send is blocked in the UI", async ({
    page,
  }) => {
    await mockBroadcast(page, happyPath);
    await openPage(page);
    await fillForm(page, "");
    await page.getByTestId("notifications-simulate").click();
    await expect(page.getByTestId("sim-devices")).toBeVisible();
    await expect(page.getByTestId("notifications-send")).toBeDisabled();
    await expect(page.getByTestId("notifications-send-hint")).toContainText(
      "lista de usuarias permitidas",
    );
  });

  test("real send goes through a confirmation that repeats text and devices", async ({
    page,
  }) => {
    const broadcast = await mockBroadcast(page, happyPath);
    await openPage(page);
    await fillForm(page);
    await page.getByTestId("notif-local-hour").fill("9");
    await page.getByTestId("notifications-simulate").click();
    await page.getByTestId("notifications-send").click();

    const dialog = page.getByTestId("notifications-confirm-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("confirm-devices")).toContainText("4 dispositivos");
    await expect(page.getByTestId("confirm-preview")).toContainText(
      "Tu ciclo empieza pronto",
    );
    // Cancelling sends nothing.
    await page.getByTestId("confirm-cancel").click();
    await expect(dialog).toBeHidden();
    expect(broadcast.calls).toHaveLength(1);

    await page.getByTestId("notifications-send").click();
    await page.getByTestId("confirm-send").click();
    await expect(page.getByTestId("out-sent")).toHaveText("4");
    await expect(page.getByTestId("out-removed")).toHaveText("1");
    expect(broadcast.calls).toHaveLength(2);
    expect(broadcast.calls[1]).toMatchObject({ dryRun: false, localHour: 9 });
    // One simulation unlocks one send.
    await expect(page.getByTestId("notifications-send")).toBeDisabled();
  });

  test("invalid local hour blocks simulating", async ({ page }) => {
    await openPage(page);
    await fillForm(page);
    await page.getByTestId("notif-local-hour").fill("24");
    await expect(page.getByTestId("notifications-simulate")).toBeDisabled();
    await expect(page.getByText("entre 0 y 23")).toBeVisible();
  });

  test("more than 200 allowed users is rejected client-side", async ({ page }) => {
    await openPage(page);
    await fillForm(page, Array.from({ length: 201 }, (_, i) => `sub-${i}`).join("\n"));
    await expect(page.getByTestId("notifications-simulate")).toBeDisabled();
    await expect(page.getByText("hasta 200 usuarias")).toBeVisible();
  });

  for (const [status, expected] of [
    [403, "No tenés permiso"],
    [400, "Revisá los datos"],
    [422, "Revisá los datos"],
    [500, "No pudimos completar"],
  ] as const) {
    test(`HTTP ${status} shows Spanish copy`, async ({ page }) => {
      await mockBroadcast(page, (_body, route) =>
        fulfillJson(route, { message: ["body must be shorter"] }, status),
      );
      await openPage(page);
      await fillForm(page);
      await page.getByTestId("notifications-simulate").click();
      await expect(page.getByTestId("notifications-error")).toContainText(expected);
      await expect(page.getByTestId("notifications-send")).toBeDisabled();
    });
  }

  test("404 degrades with a clear notice", async ({ page }) => {
    await mockBroadcast(page, (_body, route) =>
      fulfillJson(route, { message: "Cannot POST" }, 404),
    );
    await openPage(page);
    await fillForm(page);
    await page.getByTestId("notifications-simulate").click();
    await expect(page.getByTestId("notifications-unavailable")).toContainText(
      "todavía no está disponible",
    );
    await expect(page.getByTestId("notifications-send")).toBeDisabled();
  });
});
