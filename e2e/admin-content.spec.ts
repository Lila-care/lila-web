import { test, expect } from "@playwright/test";
import {
  ADMIN_ROLES,
  API_URL,
  BASE_URL,
  LEARN_API,
  REVIEWER_ROLES,
  buildArticle,
  buildBanner,
  fakeIdToken,
  fulfillJson,
  mockAdminShell,
  seedSession,
} from "./support/learnMocks";

const isArticlesList = (url: URL) => url.pathname === "/admin/learn/articles";

test.describe("Admin Contenido — listado", () => {
  test("admin ve la tabla con estado, versión y versión publicada", async ({
    page,
  }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.route(isArticlesList, (route) =>
      fulfillJson(route, [
        buildArticle(),
        buildArticle({
          articleId: "7f0c3a52-1d5e-4b8a-9c11-2f6f0e7a0002",
          title: "Qué es la ovulación",
          phase: "OVULATION",
          status: "IN_REVIEW",
          version: 3,
          published: {
            ...buildArticle(),
            phase: "OVULATION",
            version: 2,
            reviewedAt: "2026-09-10T10:00:00.000Z",
            publishedAt: "2026-09-11T10:00:00.000Z",
          },
        }),
      ]),
    );

    await page.goto(`${BASE_URL}/admin/content`);

    const rows = page.getByTestId("content-article-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1)).toContainText("Qué es la ovulación");
    await expect(rows.nth(1)).toContainText("Fase ovulatoria");
    await expect(rows.nth(1)).toContainText("v3");
    await expect(
      rows.nth(1).getByTestId("content-status-badge"),
    ).toHaveAttribute("data-status", "IN_REVIEW");
    await expect(
      rows.nth(1).getByTestId("article-published-version"),
    ).toHaveText("Publicada v2");
    // Admin keeps every section in the nav, plus the new one.
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contenido" })).toBeVisible();
    await expect(page.getByTestId("content-new-article")).toBeVisible();
    await expect(page.getByTestId("content-generate-draft")).toBeVisible();
  });

  test("filtrar por estado pide ?status= al BE", async ({ page }) => {
    await seedSession(page, ADMIN_ROLES);
    const requestedStatuses: (string | null)[] = [];
    await page.route(isArticlesList, (route) => {
      requestedStatuses.push(
        new URL(route.request().url()).searchParams.get("status"),
      );
      return fulfillJson(route, []);
    });

    await page.goto(`${BASE_URL}/admin/content`);
    await expect(page.getByTestId("content-empty")).toContainText(
      "Todavía no hay artículos",
    );
    await page.getByTestId("content-status-filter").selectOption("APPROVED");
    await expect(page.getByTestId("content-empty")).toContainText("Aprobado");
    expect(requestedStatuses).toContain(null);
    expect(requestedStatuses).toContain("APPROVED");
  });

  test("estado de error con reintentar", async ({ page }) => {
    await seedSession(page, ADMIN_ROLES);
    // A flag, not a call counter: StrictMode fires the first fetch twice in dev.
    let failing = true;
    await page.route(isArticlesList, (route) =>
      failing
        ? fulfillJson(route, { message: "boom" }, 500)
        : fulfillJson(route, [buildArticle()]),
    );

    await page.goto(`${BASE_URL}/admin/content`);
    await expect(page.getByTestId("content-error")).toBeVisible();
    failing = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("content-article-row")).toHaveCount(1);
  });
});

test.describe("Admin Contenido — crear", () => {
  test("generar borrador con IA: carga, sin doble envío, y 422 INSUFFICIENT_SOURCES", async ({
    page,
  }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.route(isArticlesList, (route) => fulfillJson(route, []));
    let draftCalls = 0;
    let releaseDraft: () => void = () => {};
    const draftReleased = new Promise<void>((resolve) => {
      releaseDraft = resolve;
    });
    await page.route(`${LEARN_API}/articles/draft`, async (route) => {
      draftCalls += 1;
      expect(route.request().postDataJSON()).toEqual({
        phase: "LUTEAL",
        title: "Antojos en la fase lútea",
        brief: "Por qué aparecen y qué hacer",
      });
      await draftReleased;
      await fulfillJson(
        route,
        { code: "INSUFFICIENT_SOURCES", message: "Not enough sources" },
        422,
      );
    });

    await page.goto(`${BASE_URL}/admin/content`);
    await page.getByTestId("content-generate-draft").click();
    await page.getByTestId("draft-title").fill("Antojos en la fase lútea");
    await page.getByLabel("Fase").last().selectOption("LUTEAL");
    await page.getByTestId("draft-brief").fill("Por qué aparecen y qué hacer");

    const submit = page.getByTestId("generate-draft-submit");
    await submit.click();
    await expect(page.getByTestId("draft-generating")).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(page.getByTestId("draft-title")).toBeDisabled();
    // A forced second click must not fire a second (slow, paid) generation.
    await submit.click({ force: true });

    releaseDraft();
    await expect(page.getByTestId("content-mutation-error")).toContainText(
      "No hay fuentes suficientes en la base de conocimiento para este tema",
    );
    await expect(page.getByTestId("draft-generating")).toHaveCount(0);
    expect(draftCalls).toBe(1);
  });

  test("generar borrador: 502 muestra reintentar", async ({ page }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.route(isArticlesList, (route) => fulfillJson(route, []));
    await page.route(`${LEARN_API}/articles/draft`, (route) =>
      fulfillJson(
        route,
        { code: "DRAFT_GENERATION_FAILED", message: "Model error" },
        502,
      ),
    );

    await page.goto(`${BASE_URL}/admin/content`);
    await page.getByTestId("content-generate-draft").click();
    await page.getByTestId("draft-title").fill("Cólicos");
    await page.getByTestId("draft-brief").fill("Qué es normal");
    await page.getByTestId("generate-draft-submit").click();

    await expect(page.getByTestId("content-mutation-error")).toContainText(
      "No se pudo generar el borrador, intenta de nuevo",
    );
  });

  test("nuevo artículo manual sugiere el slug y abre el editor", async ({
    page,
  }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.route(isArticlesList, (route) => fulfillJson(route, []));
    const created = buildArticle({ summary: "", body: [], sources: [] });
    await page.route(`${LEARN_API}/articles`, (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      expect(route.request().postDataJSON()).toEqual({
        slug: "sintomas-del-ciclo",
        phase: "MENSTRUATION",
        title: "Síntomas del ciclo",
      });
      return fulfillJson(route, created, 201);
    });
    await page.route(`${LEARN_API}/articles/${created.articleId}`, (route) =>
      fulfillJson(route, created),
    );

    await page.goto(`${BASE_URL}/admin/content`);
    await page.getByTestId("content-new-article").click();
    await page.getByTestId("new-article-title").fill("Síntomas del ciclo");
    await expect(page.getByTestId("new-article-slug")).toHaveValue(
      "sintomas-del-ciclo",
    );
    await page.getByTestId("new-article-submit").click();

    await page.waitForURL(`${BASE_URL}/admin/content/${created.articleId}`);
    await expect(page.getByTestId("article-editor")).toBeVisible();
  });

  test("slug tomado (409 SLUG_TAKEN) se explica en el formulario", async ({
    page,
  }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.route(isArticlesList, (route) =>
      route.request().method() === "POST"
        ? fulfillJson(route, { code: "SLUG_TAKEN", message: "taken" }, 409)
        : fulfillJson(route, []),
    );

    await page.goto(`${BASE_URL}/admin/content`);
    await page.getByTestId("content-new-article").click();
    await page.getByTestId("new-article-title").fill("Repetido");
    await page.getByTestId("new-article-submit").click();

    await expect(page.getByTestId("content-mutation-error")).toContainText(
      "Ya existe un artículo con ese slug",
    );
  });
});

test.describe("Admin Contenido — acceso de la revisora médica", () => {
  test("login con contraseña aterriza en Contenido filtrado a pendientes", async ({
    page,
  }) => {
    await page.route(`${API_URL}/auth/login`, (route) =>
      fulfillJson(route, {
        idToken: fakeIdToken(REVIEWER_ROLES),
        accessToken: "fake-access",
        refreshToken: "fake-refresh",
        expiresIn: 3600,
      }),
    );
    const requestedStatuses: (string | null)[] = [];
    await page.route(isArticlesList, (route) => {
      requestedStatuses.push(
        new URL(route.request().url()).searchParams.get("status"),
      );
      return fulfillJson(route, [buildArticle({ status: "IN_REVIEW" })]);
    });

    await page.goto(`${BASE_URL}/admin`);
    await page.getByTestId("login-email").fill("ginecologa@lila.app");
    await page.getByTestId("login-password").fill("not-a-real-password");
    await page.getByTestId("login-submit").click();

    await page.waitForURL(`${BASE_URL}/admin/content`);
    await expect(page.getByTestId("content-status-filter")).toHaveValue(
      "IN_REVIEW",
    );
    await expect(page.getByTestId("content-article-row")).toHaveCount(1);
    // StrictMode may fire the first fetch twice in dev; every one asks for pending reviews.
    expect(requestedStatuses.length).toBeGreaterThan(0);
    expect(new Set(requestedStatuses)).toEqual(new Set(["IN_REVIEW"]));
    // Only the content section in the nav, and no create actions.
    await expect(page.getByRole("link", { name: "Contenido" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(page.getByTestId("content-new-article")).toHaveCount(0);
    await expect(page.getByTestId("content-generate-draft")).toHaveCount(0);
  });

  test("login con Google desde /admin también aterriza en Contenido", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/terms`);
    await page.evaluate(() =>
      sessionStorage.setItem("lila_login_origin", "/admin"),
    );
    await page.route(
      (url) => url.pathname === "/oauth2/token",
      (route) =>
        fulfillJson(route, {
          id_token: fakeIdToken(REVIEWER_ROLES),
          access_token: "fake-access",
          refresh_token: "fake-refresh",
          expires_in: 3600,
        }),
    );
    await page.route(`${API_URL}/lila/guest/migrate`, (route) =>
      fulfillJson(route, { message: "Guest not found" }, 404),
    );
    await page.route(isArticlesList, (route) => fulfillJson(route, []));

    await page.goto(`${BASE_URL}/auth/callback?code=e2e-fake-code`);

    await page.waitForURL(`${BASE_URL}/admin/content`);
    await expect(page.getByTestId("content-empty")).toBeVisible();
  });

  test("otras secciones del admin la redirigen a Contenido", async ({
    page,
  }) => {
    await seedSession(page, REVIEWER_ROLES);
    await mockAdminShell(page);
    await page.route(isArticlesList, (route) => fulfillJson(route, []));

    await page.goto(`${BASE_URL}/admin/users`);

    await page.waitForURL(`${BASE_URL}/admin/content`);
    await expect(page.getByTestId("content-empty")).toContainText(
      "No hay artículos pendientes de revisión",
    );
  });

  test("admin sigue aterrizando en el dashboard", async ({ page }) => {
    await page.route(`${API_URL}/auth/login`, (route) =>
      fulfillJson(route, {
        idToken: fakeIdToken(ADMIN_ROLES),
        accessToken: "fake-access",
        refreshToken: "fake-refresh",
        expiresIn: 3600,
      }),
    );
    await mockAdminShell(page);

    await page.goto(`${BASE_URL}/admin`);
    await page.getByTestId("login-email").fill("admin@lila.app");
    await page.getByTestId("login-password").fill("not-a-real-password");
    await page.getByTestId("login-submit").click();

    await page.waitForURL(`${BASE_URL}/admin/dashboard`);
    // Regression: the login used to bounce straight back to the login form.
    await expect(page.getByTestId("login-form")).toHaveCount(0);
    await expect(page).toHaveURL(`${BASE_URL}/admin/dashboard`);
  });
});

test.describe("Admin Contenido — banners de fase", () => {
  test("admin ve las 4 fases, guarda un banner nuevo y lo envía a revisión", async ({
    page,
  }) => {
    await seedSession(page, ADMIN_ROLES);
    await page.route(isArticlesList, (route) => fulfillJson(route, []));
    await page.route(`${LEARN_API}/phase-banners`, (route) =>
      fulfillJson(route, [buildBanner({ status: "PUBLISHED" })]),
    );
    const saved = buildBanner({
      phase: "FOLLICULAR",
      text: "Energía en subida.",
      updatedAt: "2026-09-21T10:00:00.000Z",
    });
    await page.route(`${LEARN_API}/phase-banners/FOLLICULAR`, (route) => {
      expect(route.request().method()).toBe("PUT");
      expect(route.request().postDataJSON()).toEqual({
        text: "Energía en subida.",
      });
      return fulfillJson(route, saved);
    });
    await page.route(`${LEARN_API}/phase-banners/FOLLICULAR/submit`, (route) =>
      fulfillJson(route, {
        ...saved,
        status: "IN_REVIEW",
        updatedAt: "2026-09-21T11:00:00.000Z",
      }),
    );

    await page.goto(`${BASE_URL}/admin/content`);
    await page.getByTestId("content-tab-banners").click();

    for (const phase of ["MENSTRUATION", "FOLLICULAR", "OVULATION", "LUTEAL"]) {
      await expect(page.getByTestId(`banner-${phase}`)).toBeVisible();
    }
    await expect(page.getByTestId("banner-MENSTRUATION")).toContainText(
      "Sin banner",
    );
    // Nothing to submit until the first save creates the banner.
    await expect(page.getByTestId("banner-MENSTRUATION-submit")).toHaveCount(0);

    const follicular = page.getByTestId("banner-FOLLICULAR");
    await follicular
      .getByTestId("banner-FOLLICULAR-text")
      .fill("Energía en subida.");
    await follicular.getByTestId("banner-FOLLICULAR-save").click();
    await expect(
      follicular.getByTestId("content-status-badge"),
    ).toHaveAttribute("data-status", "DRAFT");
    await follicular.getByTestId("banner-FOLLICULAR-submit").click();
    await expect(
      follicular.getByTestId("content-status-badge"),
    ).toHaveAttribute("data-status", "IN_REVIEW");
  });

  test("la revisora pide cambios a un banner (notas obligatorias)", async ({
    page,
  }) => {
    await seedSession(page, REVIEWER_ROLES);
    await page.route(isArticlesList, (route) => fulfillJson(route, []));
    const inReview = buildBanner({ status: "IN_REVIEW", version: 2 });
    await page.route(`${LEARN_API}/phase-banners`, (route) =>
      fulfillJson(route, [inReview]),
    );
    const reviewBodies: unknown[] = [];
    await page.route(`${LEARN_API}/phase-banners/LUTEAL/review`, (route) => {
      reviewBodies.push(route.request().postDataJSON());
      return fulfillJson(route, {
        ...inReview,
        status: "CHANGES_REQUESTED",
        review: {
          reviewerId: "rev",
          decision: "request_changes",
          notes: "Suaviza el tono",
          reviewedVersion: 2,
          reviewedAt: "2026-09-21T10:00:00.000Z",
        },
        updatedAt: "2026-09-21T10:00:00.000Z",
      });
    });

    await page.goto(`${BASE_URL}/admin/content`);
    await page.getByTestId("content-tab-banners").click();
    const luteal = page.getByTestId("banner-LUTEAL");
    // Read-only for the reviewer: no textarea, no save/submit/publish.
    await expect(
      luteal.locator("textarea#banner-LUTEAL-review-notes"),
    ).toBeVisible();
    await expect(luteal.getByTestId("banner-LUTEAL-save")).toHaveCount(0);
    await expect(luteal.getByTestId("banner-LUTEAL-publish")).toHaveCount(0);

    await luteal.getByTestId("banner-LUTEAL-request-changes").click();
    await expect(
      luteal.getByTestId("banner-LUTEAL-review-notes-error"),
    ).toBeVisible();
    expect(reviewBodies).toHaveLength(0);

    await luteal
      .getByTestId("banner-LUTEAL-review-notes")
      .fill("Suaviza el tono");
    await luteal.getByTestId("banner-LUTEAL-request-changes").click();
    await expect(luteal.getByTestId("review-notes-notice")).toContainText(
      "Suaviza el tono",
    );
    expect(reviewBodies).toEqual([
      { decision: "request_changes", notes: "Suaviza el tono" },
    ]);
  });
});
