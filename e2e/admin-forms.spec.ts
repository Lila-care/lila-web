import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Mirrors how Login/AuthCallback persist the session — must run via an initial navigation
// so localStorage exists for the origin before ProtectedRoute reads it.
function fakeIdToken(): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "admin-e2e",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "admin@lila.app",
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

async function seedAuthToken(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    (t) => localStorage.setItem("lila_id_token", t),
    fakeIdToken(),
  );
}

const DRAFT_FORM = {
  formId: "form-1",
  name: "Chequeo semanal",
  description: "Preguntas de seguimiento semanal",
  objective: "Medir bienestar",
  questions: [
    {
      id: "q1",
      order: 0,
      text: "¿Cómo te sientes hoy?",
      key: "feeling",
      config: { type: "text", required: true },
    },
  ],
  status: "draft",
  version: 1,
  isDefault: false,
  createdBy: "admin-e2e",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

test.describe("Admin Forms — listar, crear como borrador, publicar", () => {
  test("estado vacío — muestra mensaje cuando no hay forms", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/lila/forms`, (route) =>
      fulfillJson(route, []),
    );

    await page.goto(`${BASE_URL}/admin/forms`);

    await expect(page.getByTestId("forms-empty")).toBeVisible();
    await expect(page.getByTestId("form-row")).toHaveCount(0);
  });

  test("estado de error — muestra mensaje si la API falla", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/lila/forms`, (route) =>
      fulfillJson(route, { message: "Internal error" }, 500),
    );

    await page.goto(`${BASE_URL}/admin/forms`);

    await expect(page.getByTestId("forms-error")).toBeVisible();
  });

  test("happy path — crear un form como borrador y publicarlo", async ({
    page,
  }) => {
    await seedAuthToken(page);

    let forms: (typeof DRAFT_FORM)[] = [];

    await page.route(`${API_URL}/lila/forms`, async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, forms);
        return;
      }
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        const created = {
          ...DRAFT_FORM,
          name: body.name,
          description: body.description,
          objective: body.objective,
          questions: body.questions.map(
            (q: Record<string, unknown>, i: number) => ({
              id: `q${i}`,
              order: i,
              ...q,
            }),
          ),
        };
        forms = [created];
        await fulfillJson(route, created, 201);
        return;
      }
      throw new Error(`Unexpected method ${route.request().method()}`);
    });

    await page.route(
      `${API_URL}/lila/forms/${DRAFT_FORM.formId}`,
      async (route) => {
        if (route.request().method() === "GET") {
          await fulfillJson(route, forms[0] ?? DRAFT_FORM);
        } else {
          await route.continue();
        }
      },
    );

    await page.route(
      `${API_URL}/lila/forms/${DRAFT_FORM.formId}/publish`,
      async (route) => {
        const published = { ...(forms[0] ?? DRAFT_FORM), status: "live" };
        forms = [published];
        await fulfillJson(route, published);
      },
    );

    await page.goto(`${BASE_URL}/admin/forms`);
    await expect(page.getByTestId("forms-empty")).toBeVisible();

    // --- Create ---
    await page.getByTestId("forms-create-button").click();
    await expect(page.getByTestId("form-editor")).toBeVisible();

    await page.getByTestId("form-name").fill("Chequeo semanal");
    await page
      .getByTestId("form-description")
      .fill("Preguntas de seguimiento semanal");
    await page.getByTestId("form-objective").fill("Medir bienestar");

    await page.getByTestId("question-add").click();
    await page.getByTestId("question-text").fill("¿Cómo te sientes hoy?");
    await page.getByTestId("question-key").fill("feeling");

    await page.getByTestId("form-save-button").click();

    // Back on the list, the new draft form is visible with its status badge.
    await expect(page.getByTestId("form-row")).toHaveCount(1);
    await expect(page.getByTestId("form-status-badge")).toHaveAttribute(
      "data-status",
      "draft",
    );

    // --- Publish ---
    await page.getByTestId("form-row").click();
    await expect(page.getByTestId("form-detail")).toBeVisible();
    await expect(page.getByTestId("publish-button")).toBeVisible();

    await page.getByTestId("publish-button").click();
    await expect(page.getByTestId("publish-confirm")).toBeVisible();
    await page.getByTestId("publish-confirm-button").click();

    await expect(page.getByTestId("form-detail-loading")).toHaveCount(0);
    await expect(
      page.getByTestId("form-detail").getByTestId("form-status-badge"),
    ).toHaveAttribute("data-status", "live");

    // A live form is read-only: no editor, no publish button.
    await expect(page.getByTestId("form-editor")).toHaveCount(0);
    await expect(page.getByTestId("publish-button")).toHaveCount(0);
    await expect(page.getByTestId("form-readonly-note")).toBeVisible();
  });
});

const LIVE_FORM_NOT_DEFAULT = {
  ...DRAFT_FORM,
  formId: "form-live-1",
  status: "live",
  isDefault: false,
};

const LIVE_FORM_DEFAULT = {
  ...DRAFT_FORM,
  formId: "form-live-default",
  status: "live",
  isDefault: true,
};

test.describe("Admin Forms — pasar a borrador (unpublish)", () => {
  test("form live no-default — confirmar pasa a borrador sin advertencia de onboarding", async ({
    page,
  }) => {
    await seedAuthToken(page);

    let currentForm: typeof LIVE_FORM_NOT_DEFAULT = {
      ...LIVE_FORM_NOT_DEFAULT,
    };

    await page.route(`${API_URL}/lila/forms`, (route) =>
      fulfillJson(route, [currentForm]),
    );

    await page.route(
      `${API_URL}/lila/forms/${LIVE_FORM_NOT_DEFAULT.formId}`,
      async (route) => {
        if (route.request().method() === "GET") {
          await fulfillJson(route, currentForm);
        } else {
          await route.continue();
        }
      },
    );

    await page.route(
      `${API_URL}/lila/forms/${LIVE_FORM_NOT_DEFAULT.formId}/unpublish`,
      async (route) => {
        currentForm = { ...currentForm, status: "draft" };
        await fulfillJson(route, currentForm);
      },
    );

    await page.goto(`${BASE_URL}/admin/forms`);
    await page.getByTestId("form-row").click();
    await expect(page.getByTestId("form-detail")).toBeVisible();

    await expect(page.getByTestId("unpublish-button")).toBeVisible();
    await page.getByTestId("unpublish-button").click();

    await expect(page.getByTestId("unpublish-confirm")).toBeVisible();
    await expect(page.getByTestId("unpublish-confirm")).not.toContainText(
      "onboarding",
    );

    await page.getByTestId("unpublish-confirm-button").click();

    await expect(page.getByTestId("form-detail-loading")).toHaveCount(0);
    await expect(
      page.getByTestId("form-detail").getByTestId("form-status-badge"),
    ).toHaveAttribute("data-status", "draft");
    await expect(page.getByTestId("form-editor")).toBeVisible();
  });

  test("form live default — el diálogo advierte sobre impacto en onboarding", async ({
    page,
  }) => {
    await seedAuthToken(page);

    await page.route(`${API_URL}/lila/forms`, (route) =>
      fulfillJson(route, [LIVE_FORM_DEFAULT]),
    );

    await page.route(
      `${API_URL}/lila/forms/${LIVE_FORM_DEFAULT.formId}`,
      async (route) => {
        if (route.request().method() === "GET") {
          await fulfillJson(route, LIVE_FORM_DEFAULT);
        } else {
          await route.continue();
        }
      },
    );

    let unpublishCalled = false;
    await page.route(
      `${API_URL}/lila/forms/${LIVE_FORM_DEFAULT.formId}/unpublish`,
      async (route) => {
        unpublishCalled = true;
        await fulfillJson(route, { ...LIVE_FORM_DEFAULT, status: "draft" });
      },
    );

    await page.goto(`${BASE_URL}/admin/forms`);
    await page.getByTestId("form-row").click();
    await expect(page.getByTestId("form-detail")).toBeVisible();

    await page.getByTestId("unpublish-button").click();
    await expect(page.getByTestId("unpublish-confirm")).toBeVisible();
    await expect(page.getByTestId("unpublish-confirm")).toContainText(
      "onboarding",
    );

    // Cancel must not call the API.
    await page.getByTestId("unpublish-cancel-button").click();
    await expect(page.getByTestId("unpublish-confirm")).toHaveCount(0);
    expect(unpublishCalled).toBe(false);
  });
});

test.describe("Admin Forms — pregunta de tipo fecha, checkbox 'No permitir fechas futuras'", () => {
  test("el checkbox solo aparece para preguntas type=date y se persiste al guardar", async ({
    page,
  }) => {
    await seedAuthToken(page);

    let createdBody: Record<string, unknown> | null = null;
    let forms: Record<string, unknown>[] = [];

    await page.route(`${API_URL}/lila/forms`, async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, forms);
        return;
      }
      if (route.request().method() === "POST") {
        createdBody = route.request().postDataJSON();
        const created = {
          ...DRAFT_FORM,
          name: createdBody.name,
          questions: (createdBody.questions as Record<string, unknown>[]).map(
            (q, i) => ({ id: `q${i}`, order: i, ...q }),
          ),
        };
        forms = [created];
        await fulfillJson(route, created, 201);
        return;
      }
      throw new Error(`Unexpected method ${route.request().method()}`);
    });

    await page.goto(`${BASE_URL}/admin/forms`);
    await page.getByTestId("forms-create-button").click();
    await expect(page.getByTestId("form-editor")).toBeVisible();

    await page.getByTestId("form-name").fill("Form con fecha");
    await page.getByTestId("form-description").fill("desc");
    await page.getByTestId("form-objective").fill("obj");

    await page.getByTestId("question-add").click();
    await page.getByTestId("question-text").fill("¿Cuándo empezó tu ciclo?");
    await page.getByTestId("question-key").fill("lastPeriodDate");

    // Default type is "text" — the checkbox must not be present yet.
    await expect(page.getByTestId("question-disallow-future")).toHaveCount(0);

    // Switch the question type to "date" via the shadcn Select.
    await page.getByTestId("question-type").click();
    await page.getByRole("option", { name: "date" }).click();

    await expect(page.getByTestId("question-disallow-future")).toBeVisible();
    await page.getByTestId("question-disallow-future").click();

    await page.getByTestId("form-save-button").click();

    await expect(page.getByTestId("form-row")).toHaveCount(1);
    expect(createdBody).not.toBeNull();
    const savedQuestion = (
      createdBody as unknown as { questions: Record<string, unknown>[] }
    ).questions[0];
    expect(savedQuestion.config).toMatchObject({
      type: "date",
      disallowFuture: true,
    });
  });

  test("el checkbox desaparece si se cambia el tipo de vuelta a uno distinto de date", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await page.route(`${API_URL}/lila/forms`, (route) =>
      fulfillJson(route, []),
    );

    await page.goto(`${BASE_URL}/admin/forms`);
    await page.getByTestId("forms-create-button").click();
    await page.getByTestId("question-add").click();

    await page.getByTestId("question-type").click();
    await page.getByRole("option", { name: "date" }).click();
    await expect(page.getByTestId("question-disallow-future")).toBeVisible();

    await page.getByTestId("question-type").click();
    await page.getByRole("option", { name: "number" }).click();
    await expect(page.getByTestId("question-disallow-future")).toHaveCount(0);
  });
});
