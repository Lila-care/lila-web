import { test, expect, type Page } from "@playwright/test";
import {
  buildEntitlementPlan,
  mockEntitlementsApi,
} from "./support/planEntitlementsMocks";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

function fakeIdToken(): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const payload = {
    sub: "admin-e2e",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "admin@lila.app",
  };
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fakesignature`;
}

async function seedAuthToken(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(
    (t) => localStorage.setItem("lila_id_token", t),
    fakeIdToken(),
  );
}

async function openFeaturesTab(page: Page) {
  await page.goto(`${BASE_URL}/admin/plans`);
  await page.getByRole("tab", { name: "Características" }).click();
  await expect(page.getByTestId("features-matrix")).toBeVisible();
}

async function openEditPanel(page: Page) {
  await page.goto(`${BASE_URL}/admin/plans`);
  await page.getByTestId("plan-edit-plan-1").click();
  await expect(page.getByRole("dialog", { name: "Editar plan" })).toBeVisible();
}

test.describe("Admin Plans — panel Características", () => {
  test("el panel renderiza el catálogo agrupado; los valores por defecto se personalizan y 'Próximamente' queda deshabilitado", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, { plans: [buildEntitlementPlan()] });
    await openEditPanel(page);

    for (const group of ["chat", "learn", "cycle", "upcoming"]) {
      await expect(page.getByTestId(`feature-group-${group}`)).toBeVisible();
    }
    await expect(page.getByTestId("plan-features")).toContainText(
      "Vacío = Ilimitado · 0 = Bloqueado. Los valores ausentes usan el catálogo. Guardar aplica de inmediato.",
    );
    // The old free-standing field is gone.
    await expect(page.getByTestId("plan-max-interactions-input")).toHaveCount(0);

    // Saved custom value (30): enabled, offers "Usar valor por defecto".
    await expect(
      page.getByTestId("feature-limit-input-daily_chat_messages"),
    ).toHaveValue("30");
    await expect(page.getByTestId("feature-reset-daily_chat_messages")).toBeVisible();

    // At default: locked, "Por defecto" + "Personalizar".
    const reports = page.getByTestId("feature-switch-ai_reports");
    await expect(reports).toHaveAttribute("role", "switch");
    await expect(reports).toBeDisabled();
    await expect(page.getByTestId("feature-row-ai_reports")).toContainText("Por defecto");
    await page.getByTestId("feature-customize-ai_reports").click();
    await expect(reports).toBeEnabled();

    // enforced:false → only the "Próximamente" tag: no control showing a fake value, no actions.
    const soon = page.getByTestId("feature-row-doctor_report_pdf");
    await expect(soon).toContainText("Próximamente");
    await expect(page.getByTestId("feature-switch-doctor_report_pdf")).toHaveCount(0);
    await expect(page.getByTestId("feature-limit-input-gyn_consults_per_month")).toHaveCount(0);
    await expect(page.getByTestId("feature-customize-doctor_report_pdf")).toHaveCount(0);
  });

  test("PATCH envía solo las keys modificadas; Ilimitado manda null; 0 muestra la nota", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
    });
    await openEditPanel(page);
    await expect(page.getByTestId("plan-unsaved-summary")).toHaveCount(0);

    await page.getByTestId("feature-customize-ai_reports").click();
    await page.getByTestId("feature-switch-ai_reports").click();
    await expect(page.getByTestId("feature-switch-ai_reports")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.getByTestId("feature-modified-ai_reports")).toBeVisible();
    await expect(page.getByTestId("plan-unsaved-summary")).toHaveText(
      "1 cambio sin guardar",
    );

    await page.getByTestId("feature-customize-learn_articles_per_month").click();
    await page.getByTestId("feature-unlimited-learn_articles_per_month").uncheck();
    await page.getByTestId("feature-limit-input-learn_articles_per_month").fill("4");
    await expect(page.getByTestId("plan-unsaved-summary")).toHaveText(
      "2 cambios sin guardar",
    );
    await page.getByTestId("feature-unlimited-learn_articles_per_month").check();
    // Back to the default → no longer a change.
    await expect(page.getByTestId("plan-unsaved-summary")).toHaveText(
      "1 cambio sin guardar",
    );

    await page.getByTestId("feature-unlimited-daily_chat_messages").check();
    await expect(page.getByTestId("feature-limit-input-daily_chat_messages")).toBeDisabled();
    await page.getByTestId("feature-unlimited-daily_chat_messages").uncheck();
    await page.getByTestId("feature-limit-input-daily_chat_messages").fill("0");
    await expect(page.getByTestId("feature-zero-note-daily_chat_messages")).toHaveText(
      "0 bloquea esta característica",
    );
    await expect(page.getByTestId("plan-unsaved-summary")).toHaveText(
      "2 cambios sin guardar",
    );

    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);

    expect(api.mutations).toHaveLength(1);
    const { method, body } = api.mutations[0];
    expect(method).toBe("PATCH");
    expect(body.entitlements).toEqual({ ai_reports: false, daily_chat_messages: 0 });
    expect(body).not.toHaveProperty("maxInteractionsPerDay");
  });

  test("Usar valor por defecto restaura el catálogo y vuelve a bloquear la fila", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
    });
    await openEditPanel(page);

    await page.getByTestId("feature-reset-daily_chat_messages").click();
    await expect(page.getByTestId("feature-limit-input-daily_chat_messages")).toBeDisabled();
    await expect(page.getByTestId("feature-unlimited-daily_chat_messages")).toBeChecked();
    await expect(page.getByTestId("feature-customize-daily_chat_messages")).toBeVisible();
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations[0].body.entitlements).toEqual({ daily_chat_messages: null });
  });

  test("revertir un valor quita 'Modificado' y el cambio no se envía", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
    });
    await openEditPanel(page);

    const input = page.getByTestId("feature-limit-input-daily_chat_messages");
    await input.fill("50");
    await expect(page.getByTestId("feature-modified-daily_chat_messages")).toBeVisible();
    await input.fill("30");
    await expect(page.getByTestId("feature-modified-daily_chat_messages")).toHaveCount(0);

    await page.getByTestId("plan-name-input").fill("Plan Mensual Plus");
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations[0].body).not.toHaveProperty("entitlements");
  });

  test("validación por fila: decimal o negativo marca la fila y bloquea Guardar; vacío = Ilimitado", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, { plans: [buildEntitlementPlan()] });
    await openEditPanel(page);
    const input = page.getByTestId("feature-limit-input-daily_chat_messages");

    await input.fill("2,5");
    await expect(page.getByTestId("feature-error-daily_chat_messages")).toHaveText(
      "Debe ser un número entero.",
    );
    await expect(page.getByTestId("plan-save-button")).toBeDisabled();
    await expect(page.getByTestId("plan-invalid-hint")).toHaveText(
      "Corregir los valores de las filas señaladas antes de guardar.",
    );

    await input.fill("-2");
    await expect(page.getByTestId("feature-error-daily_chat_messages")).toHaveText(
      "No puede ser negativo.",
    );
    await input.fill("");
    await expect(page.getByTestId("feature-error-daily_chat_messages")).toHaveCount(0);
    await expect(page.getByTestId("plan-save-button")).toBeEnabled();
  });

  test("crear plan envía solo las características que se cambiaron respecto al default", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page);
    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByTestId("plans-empty-create").click();

    await page.getByTestId("plan-name-input").fill("Plan Plus");
    await page.getByTestId("plan-amount-input").fill("19900");
    await page.getByTestId("feature-customize-advanced_model").click();
    await page.getByTestId("feature-switch-advanced_model").click();
    await page.getByTestId("plan-save-button").click();

    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations[0].method).toBe("POST");
    expect(api.mutations[0].body.entitlements).toEqual({ advanced_model: true });
    await expect(page.getByTestId("plan-row-plan-1")).toContainText("Plan Plus");
  });

  test("400 con errors[]: copy en español con el nombre de la característica, nunca el texto crudo", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      rejectMutationsWith: ["daily_chat_messages must be an integer number"],
    });
    await openEditPanel(page);

    await page.getByTestId("feature-reset-daily_chat_messages").click();
    await page.getByTestId("plan-save-button").click();

    const error = page.getByTestId("plan-save-error");
    await expect(error).toContainText(
      "Revisa el valor de «Mensajes con Lila por día»",
    );
    await expect(error).not.toContainText("must be an integer");
    await expect(page.getByTestId("plan-panel")).toBeVisible();
  });

  test("400 con errors[] sin key reconocible: aviso genérico", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      rejectMutationsWith: ["something unexpected"],
    });
    await openEditPanel(page);
    await page.getByTestId("feature-reset-daily_chat_messages").click();
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-save-error")).toHaveText(
      "Revisa los valores de las características.",
    );
  });

  test("vacío sin 'Ilimitado' avisa 'Quedará ilimitado'; un valor gigante se marca", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, { plans: [buildEntitlementPlan()] });
    await openEditPanel(page);
    const input = page.getByTestId("feature-limit-input-daily_chat_messages");

    await input.fill("");
    await expect(page.getByTestId("feature-empty-note-daily_chat_messages")).toHaveText(
      "Quedará ilimitado",
    );
    await input.fill("99999999999999999999");
    await expect(page.getByTestId("feature-error-daily_chat_messages")).toHaveText(
      "Valor demasiado grande.",
    );
    await expect(page.getByTestId("plan-save-button")).toBeDisabled();
  });

  test("plan 'Próximamente': el switch de estado queda deshabilitado y el estado se lee como texto", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan({ status: "coming_soon" })],
      subscribers: { "plan-1": 4 },
    });
    await openEditPanel(page);
    await expect(page.getByTestId("plan-status-toggle")).toBeDisabled();
    await expect(page.getByTestId("plan-status-value")).toHaveText("Próximamente");

    // Reducing access never asks for confirmation on a plan that isn't active.
    await page.getByTestId("feature-limit-input-daily_chat_messages").fill("10");
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0].body.status).toBe("coming_soon");
  });

  test("catálogo con error: mensaje y Reintentar lo recupera", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      featuresFailing: true,
    });
    await openEditPanel(page);

    const error = page.getByTestId("plan-features-error");
    await expect(error).toContainText("No pudimos cargar las características.");
    api.setFeaturesFailing(false);
    await error.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("feature-row-ai_reports")).toBeVisible();
    await expect(page.getByTestId("plan-features-error")).toHaveCount(0);
  });
});

test.describe("Admin Plans — tabla de planes", () => {
  test("la columna Características muestra dos líneas y el pie del diseño", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [
        buildEntitlementPlan({
          planId: "plan-1",
          entitlements: { daily_chat_messages: 5 },
        }),
        buildEntitlementPlan({
          planId: "plan-2",
          name: "Premium",
          entitlements: {
            daily_chat_messages: null,
            learn_articles_per_month: 3,
          },
        }),
      ],
    });
    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("plan-features-plan-1")).toHaveText(
      "5 mensajes / díaAprende ilimitado · Por defecto",
    );
    await expect(page.getByTestId("plan-features-plan-2")).toHaveText(
      "Ilimitado / díaAprende 3/mes · Personalizado",
    );
    await expect(page.getByTestId("plans-ledger-footnote")).toHaveText(
      "El detalle completo está en Características y en Editar plan. Los valores no configurados heredan el catálogo.",
    );
  });

  test("sin catálogo la tabla cae a la línea del límite diario", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      featuresFailing: true,
    });
    await page.goto(`${BASE_URL}/admin/plans`);
    await expect(page.getByTestId("plan-features-plan-1")).toHaveText(
      "30 mensajes / día",
    );
  });
});

test.describe("Admin Plans — tab Características (matriz)", () => {
  test("renderiza título, columnas por plan (también inactivos), valores y 'Por defecto'", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [
        buildEntitlementPlan({
          planId: "plan-1",
          name: "Gratis",
          entitlements: { daily_chat_messages: 5 },
        }),
        buildEntitlementPlan({
          planId: "plan-2",
          name: "Premium anual",
          status: "inactive",
          entitlements: { daily_chat_messages: null, ai_reports: false },
        }),
      ],
    });
    await openFeaturesTab(page);

    await expect(
      page.getByRole("heading", { name: "Características por plan", level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId("plans-page-subtitle")).toHaveText(
      "Valores efectivos del catálogo. Una configuración para todas las suscriptoras de cada plan.",
    );
    await expect(page.getByTestId("plans-create-button")).toHaveCount(0);
    const matrix = page.getByTestId("features-matrix");
    await expect(matrix).toContainText("Premium anual");
    await expect(matrix).toContainText("Inactivo");

    for (const group of ["chat", "learn", "cycle", "upcoming"]) {
      await expect(page.getByTestId(`matrix-group-${group}`)).toBeVisible();
    }
    const daily = (plan: string) =>
      page.getByTestId(`matrix-cell-${plan}-daily_chat_messages`);
    await expect(daily("plan-1")).toContainText("5");
    await expect(daily("plan-1")).not.toContainText("Por defecto");
    await expect(daily("plan-2")).toContainText("Ilimitado");
    await expect(daily("plan-2")).toContainText("Por defecto");
    // Flags: ✓ / —.
    await expect(page.getByTestId("matrix-cell-plan-1-ai_reports")).toContainText("✓");
    await expect(page.getByTestId("matrix-cell-plan-2-ai_reports")).toContainText("—");
    await expect(page.getByTestId("matrix-default-plan-2-ai_reports")).toHaveCount(0);
    await expect(page.getByTestId("matrix-cell-plan-1-advanced_model")).toContainText("—");
    await expect(page.getByTestId("matrix-row-advanced_model")).toContainText("Activo / Inactivo");
    await expect(page.getByTestId("matrix-row-daily_chat_messages")).toContainText("por día");
  });

  test("Próximamente: texto atenuado y no interactivo; un valor 0 se lee 'Bloqueado'", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [
        buildEntitlementPlan({ entitlements: { daily_chat_messages: 0 } }),
      ],
    });
    await openFeaturesTab(page);
    const soon = page.getByTestId("matrix-cell-plan-1-doctor_report_pdf");
    await expect(soon).toHaveText(
      "Reporte PDF para la consulta, Plan Mensual: Próximamente",
    );
    expect(await soon.evaluate((el) => el.tagName)).not.toBe("BUTTON");
    await expect(page.getByTestId("matrix-cell-plan-1-daily_chat_messages")).toContainText(
      "Bloqueado",
    );
  });

  test("clic en una celda abre Editar plan con foco en esa característica", async ({
    page,
  }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, { plans: [buildEntitlementPlan()] });
    await openFeaturesTab(page);

    const cell = page.getByRole("button", {
      name: /Reportes del ciclo con IA, Plan Mensual: Activo\. Editar plan/,
    });
    await cell.click();
    await expect(page.getByRole("dialog", { name: "Editar plan" })).toBeVisible();
    await expect(page.getByTestId("feature-row-ai_reports")).toBeFocused();
  });

  test("estados: error con Reintentar, vacío y carga", async ({ page }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      featuresFailing: true,
    });
    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByRole("tab", { name: "Características" }).click();
    const error = page.getByTestId("features-error");
    await expect(error).toBeVisible();
    api.setFeaturesFailing(false);
    await error.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("features-matrix")).toBeVisible();
  });

  test("sin planes muestra el estado vacío", async ({ page }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page);
    await page.goto(`${BASE_URL}/admin/plans`);
    await page.getByRole("tab", { name: "Características" }).click();
    await expect(page.getByTestId("features-empty")).toBeVisible();
  });

  test("viewport 375 — filas apiladas con el nombre del plan sobre cada valor, sin scroll horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [
        buildEntitlementPlan({ planId: "plan-1", name: "Gratis" }),
        buildEntitlementPlan({ planId: "plan-2", name: "Premium" }),
        buildEntitlementPlan({ planId: "plan-3", name: "Max" }),
      ],
    });
    await openFeaturesTab(page);

    const row = page.getByTestId("matrix-row-daily_chat_messages");
    await expect(row).toContainText("Gratis");
    await expect(row).toContainText("Max");
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });
});

test.describe("Admin Plans — Confirmar cambio", () => {
  async function reduceDailyLimit(page: Page) {
    await openEditPanel(page);
    await page.getByTestId("feature-limit-input-daily_chat_messages").fill("10");
    await page.getByTestId("plan-save-button").click();
  }

  test("plan activo con suscriptoras y reducción: pide confirmar y Confirmar envía el PATCH", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan({ entitlements: { daily_chat_messages: null, ai_reports: true } })],
      subscribers: { "plan-1": 3 },
    });
    await openEditPanel(page);
    await page.getByTestId("feature-customize-daily_chat_messages").click();
    await page.getByTestId("feature-unlimited-daily_chat_messages").uncheck();
    await page.getByTestId("feature-limit-input-daily_chat_messages").fill("30");
    await page.getByTestId("feature-customize-ai_reports").click();
    await page.getByTestId("feature-switch-ai_reports").click();
    await page.getByTestId("plan-save-button").click();

    const dialog = page.getByRole("dialog", { name: "Confirmar cambio" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "dialog");
    await expect(dialog).toContainText(
      "Este cambio afecta a 3 suscriptoras de Plan Mensual y aplica de inmediato.",
    );
    await expect(page.getByTestId("confirm-reduction-daily_chat_messages")).toContainText(
      "Ilimitado",
    );
    await expect(page.getByTestId("confirm-reduction-daily_chat_messages")).toContainText(
      "30 por día",
    );
    await expect(page.getByTestId("confirm-reduction-ai_reports")).toContainText("Activo");
    await expect(page.getByTestId("confirm-reduction-ai_reports")).toContainText("Inactivo");
    expect(api.mutations).toHaveLength(0);

    await page.getByTestId("confirm-accept").click();
    await expect(page.getByTestId("confirm-success")).toContainText("Plan guardado");
    // The mock's GET after the PATCH already returns the reduced values: the dialog must keep
    // the list it opened with.
    await expect(page.getByTestId("confirm-success")).toContainText(
      "Los 2 cambios se aplicaron de inmediato.",
    );
    await expect(page.getByTestId("confirm-reduction-daily_chat_messages")).toBeVisible();
    await expect(page.getByTestId("confirm-reduction-ai_reports")).toBeVisible();
    expect(api.mutations).toHaveLength(1);
    expect(api.mutations[0].body.entitlements).toEqual({
      daily_chat_messages: 30,
      ai_reports: false,
    });
    await page.getByTestId("confirm-done").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
  });

  test("Cancelar vuelve al panel sin guardar; Esc también", async ({ page }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      subscribers: { "plan-1": 2 },
    });
    await reduceDailyLimit(page);
    await expect(page.getByTestId("confirm-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("confirm-dialog")).toHaveCount(0);
    await expect(page.getByTestId("plan-panel")).toBeVisible();
    await page.getByTestId("plan-save-button").click();
    await page.getByTestId("confirm-cancel").click();
    await expect(page.getByTestId("confirm-dialog")).toHaveCount(0);
    expect(api.mutations).toHaveLength(0);
  });

  test("error al guardar muestra el aviso y Reintentar", async ({ page }) => {
    await seedAuthToken(page);
    await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      subscribers: { "plan-1": 2 },
      rejectMutationsWith: ["boom"],
    });
    await reduceDailyLimit(page);
    await page.getByTestId("confirm-accept").click();
    await expect(page.getByTestId("confirm-error")).toContainText(
      "No se pudo guardar el plan",
    );
    await expect(page.getByTestId("confirm-accept")).toHaveText("Reintentar");
  });

  test("sin suscriptoras se guarda directo, sin diálogo", async ({ page }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      subscribers: { "plan-1": 0 },
    });
    await reduceDailyLimit(page);
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations).toHaveLength(1);
  });

  test("subir el acceso no pide confirmación aunque haya suscriptoras", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      subscribers: { "plan-1": 5 },
    });
    await openEditPanel(page);
    await page.getByTestId("feature-limit-input-daily_chat_messages").fill("50");
    await page.getByTestId("plan-save-button").click();
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations).toHaveLength(1);
  });

  test("plan inactivo: reducir no pide confirmación", async ({ page }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan({ status: "inactive" })],
      subscribers: { "plan-1": 5 },
    });
    await reduceDailyLimit(page);
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations).toHaveLength(1);
  });

  test("si no se puede saber N, no se guarda y se avisa", async ({ page }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      statsFailing: true,
    });
    await reduceDailyLimit(page);
    await expect(page.getByTestId("plan-save-error")).toContainText(
      "No pudimos verificar las suscriptoras del plan",
    );
    await expect(page.getByTestId("confirm-dialog")).toHaveCount(0);
    expect(api.mutations).toHaveLength(0);
  });

  test("N usa activeCount: past_due no cuenta y no dispara el diálogo", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      subscribers: { "plan-1": 0 },
      pastDue: { "plan-1": 4 },
    });
    await reduceDailyLimit(page);
    await expect(page.getByTestId("confirm-dialog")).toHaveCount(0);
    await expect(page.getByTestId("plan-panel")).toHaveCount(0);
    expect(api.mutations).toHaveLength(1);
  });

  test("BE viejo sin activeCount: la verificación falla y no se guarda", async ({
    page,
  }) => {
    await seedAuthToken(page);
    const api = await mockEntitlementsApi(page, {
      plans: [buildEntitlementPlan()],
      subscribers: { "plan-1": 2 },
      legacyStats: true,
    });
    await reduceDailyLimit(page);
    await expect(page.getByTestId("plan-save-error")).toContainText(
      "No pudimos verificar las suscriptoras del plan",
    );
    expect(api.mutations).toHaveLength(0);
  });
});
