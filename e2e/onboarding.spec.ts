import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 10 };

function agentMeBody(overrides: {
  onboardingPending: boolean;
  greetingMessage?: string;
}) {
  return {
    userId: "test-user",
    templateVersion: 1,
    isGuest: false,
    hasActiveTemplate: true,
    freeQuestionLimit: 3,
    onboarding: {
      pending: overrides.onboardingPending,
      ...(overrides.greetingMessage
        ? { greetingMessage: overrides.greetingMessage }
        : {}),
    },
  };
}

const RECONCILIATION_DATA = {
  formId: "form-123",
  questions: [
    { questionId: "q1", text: "¿Cuál es tu edad?", answerText: "28" },
    { questionId: "q2", text: "¿Tomas anticonceptivos?", answerText: "No" },
  ],
};

function agentMeReconciliationBody(reconciliation: typeof RECONCILIATION_DATA) {
  return {
    userId: "test-user",
    templateVersion: 1,
    isGuest: false,
    hasActiveTemplate: true,
    freeQuestionLimit: 3,
    onboarding: { pending: false },
    reconciliation,
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Builds an unsigned JWT-shaped token (header.payload.signature) — the app only base64-decodes
// the payload client-side, it never verifies the signature, so a fake signature is enough.
function fakeIdToken(claims: Record<string, unknown>): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...claims,
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

test.describe("Onboarding flow", () => {
  test("guest nuevo ve el greetingMessage sin escribir nada", async ({
    page,
  }) => {
    const greeting = "¡Hola! Antes de empezar, cuéntame un poco sobre ti.";

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(
        route,
        agentMeBody({ onboardingPending: true, greetingMessage: greeting }),
      ),
    );

    await page.goto(`${BASE_URL}/chat`);

    // The greeting appears as the first assistant message without any user input.
    const firstBubble = page.getByTestId("message-bubble").first();
    await expect(firstBubble).toBeVisible();
    await expect(firstBubble).toHaveAttribute("data-role", "assistant");
    await expect(firstBubble).toContainText(greeting);

    // The chip-based EmptyState must not render while onboarding is pending.
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
  });

  test("EmptyState con chips aparece cuando onboarding.pending es false", async ({
    page,
  }) => {
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, agentMeBody({ onboardingPending: false })),
    );

    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("empty-state")).toBeVisible();
    await expect(page.getByTestId("message-bubble")).toHaveCount(0);
  });

  test("avatar y nombre reales se muestran cuando hay sesión autenticada", async ({
    page,
  }) => {
    const token = fakeIdToken({
      email: "paciente@lila.app",
      name: "Camila Paciente",
      picture: "https://example.com/avatar.png",
    });

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, agentMeBody({ onboardingPending: false })),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );

    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("account-avatar")).toBeVisible();
    await expect(page.getByTestId("account-avatar")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
    await expect(page.getByTestId("account-name")).toHaveText(
      "Camila Paciente",
    );
  });

  test("muestra iniciales cuando no hay picture en el JWT", async ({
    page,
  }) => {
    const token = fakeIdToken({
      email: "sinfoto@lila.app",
      name: "Ana Torres",
    });

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, agentMeBody({ onboardingPending: false })),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );

    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("account-avatar-initials")).toBeVisible();
    await expect(page.getByTestId("account-avatar-initials")).toHaveText("AN");
    await expect(page.getByTestId("account-name")).toHaveText("Ana Torres");
  });
});

test.describe("Onboarding reconciliation", () => {
  test("ReconciliationCard aparece en vez del EmptyState cuando agent/me trae reconciliation", async ({
    page,
  }) => {
    const token = fakeIdToken({
      email: "reconciliar@lila.app",
      name: "Reconciliar Test",
    });

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, agentMeReconciliationBody(RECONCILIATION_DATA)),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );

    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("reconciliation-card")).toBeVisible();
    await expect(page.getByTestId("empty-state")).toHaveCount(0);
    await expect(
      page.getByText(RECONCILIATION_DATA.questions[0].text),
    ).toBeVisible();
  });

  test("editar una respuesta y confirmar dispara una sola request a /lila/onboarding/reconcile", async ({
    page,
  }) => {
    const token = fakeIdToken({
      email: "reconciliar2@lila.app",
      name: "Reconciliar Dos",
    });
    let reconcileCallCount = 0;
    let reconcileBody: unknown = null;

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, agentMeReconciliationBody(RECONCILIATION_DATA)),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/lila/onboarding/reconcile`, async (route) => {
      reconcileCallCount += 1;
      reconcileBody = route.request().postDataJSON();
      await fulfillJson(route, { success: true });
    });

    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("reconciliation-card")).toBeVisible();

    const firstQuestionId = RECONCILIATION_DATA.questions[0].questionId;
    await page
      .getByTestId(`reconciliation-edit-${firstQuestionId}`)
      .click();
    await page
      .getByTestId(`reconciliation-input-${firstQuestionId}`)
      .fill("29");

    await page.getByTestId("reconciliation-confirm").click();

    await expect(page.getByTestId("reconciliation-success")).toBeVisible();
    expect(reconcileCallCount).toBe(1);
    expect(reconcileBody).toEqual({
      formId: RECONCILIATION_DATA.formId,
      answers: [
        { questionId: "q1", answerText: "29" },
        { questionId: "q2", answerText: "No" },
      ],
    });
  });

  test("viewport 375px — sin overflow horizontal en el card", async ({
    page,
  }) => {
    const token = fakeIdToken({
      email: "reconciliar3@lila.app",
      name: "Reconciliar Tres",
    });
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, agentMeReconciliationBody(RECONCILIATION_DATA)),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );

    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("reconciliation-card")).toBeVisible();

    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

// Seeds the id token into localStorage before the app boots, mirroring how Login/AuthCallback
// persist it — must happen via an initial navigation so localStorage exists for the origin.
async function seedAuthToken(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t) => localStorage.setItem("lila_id_token", t), token);
}
