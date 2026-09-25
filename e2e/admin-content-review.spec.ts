import { test, expect } from "@playwright/test";
import {
  ADMIN_ROLES,
  BASE_URL,
  LEARN_API,
  REVIEWER_ROLES,
  buildArticle,
  fulfillJson,
  seedSession,
} from "./support/learnMocks";
import type { LearnArticle } from "../src/api/learn";

const APPROVAL = {
  reviewerId: "rev-1",
  decision: "approve" as const,
  reviewedVersion: 2,
  reviewedAt: "2026-09-19T10:00:00.000Z",
};

function publishedSnapshot(article: LearnArticle, version: number) {
  return {
    title: article.title,
    summary: article.summary,
    body: article.body,
    sources: article.sources,
    readingMinutes: article.readingMinutes,
    phase: article.phase,
    order: article.order,
    version,
    reviewedAt: "2026-09-10T10:00:00.000Z",
    publishedAt: "2026-09-11T10:00:00.000Z",
  };
}

async function mockArticle(
  page: import("@playwright/test").Page,
  article: LearnArticle,
) {
  await page.route(`${LEARN_API}/articles/${article.articleId}`, (route) =>
    route.request().method() === "GET"
      ? fulfillJson(route, article)
      : route.fallback(),
  );
}

test.describe("Editor de artículo (admin)", () => {
  test("slug bloqueado si ya se publicó + aviso de versión publicada visible", async ({
    page,
  }) => {
    const base = buildArticle({ version: 3 });
    const article = { ...base, published: publishedSnapshot(base, 2) };
    await seedSession(page, ADMIN_ROLES);
    await mockArticle(page, article);

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);

    await expect(page.getByTestId("article-slug-input")).toBeDisabled();
    await expect(page.getByTestId("article-slug-locked")).toContainText(
      "ya se publicó",
    );
    await expect(page.getByTestId("published-version-notice")).toContainText(
      "La versión publicada (v2) sigue visible en la app hasta que publiques esta versión",
    );
    await expect(page.getByTestId("article-reading-minutes")).toContainText(
      "2 min",
    );
    // DRAFT: can submit, can't publish.
    await expect(page.getByTestId("article-submit")).toBeVisible();
    await expect(page.getByTestId("article-publish")).toHaveCount(0);
  });

  test("409 SLUG_LOCKED al guardar se explica y ofrece recargar", async ({
    page,
  }) => {
    const article = buildArticle();
    await seedSession(page, ADMIN_ROLES);
    let gets = 0;
    let patchBody: unknown = null;
    await page.route(`${LEARN_API}/articles/${article.articleId}`, (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = route.request().postDataJSON();
        return fulfillJson(
          route,
          { code: "SLUG_LOCKED", message: "locked" },
          409,
        );
      }
      gets += 1;
      return fulfillJson(route, article);
    });

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await page.getByTestId("article-slug-input").fill("otro-slug");
    await page.getByTestId("article-save").click();

    await expect(page.getByTestId("content-mutation-error")).toContainText(
      "El slug no se puede cambiar",
    );
    expect(patchBody).toEqual({ slug: "otro-slug" });
    const getsBeforeReload = gets;
    await page.getByTestId("content-reload").click();
    await expect(page.getByTestId("article-slug-input")).toHaveValue(
      article.slug,
    );
    expect(gets).toBeGreaterThan(getsBeforeReload);
  });

  test("editar bloques: agregar callout, reordenar y guardar solo el body", async ({
    page,
  }) => {
    const article = buildArticle({
      body: [
        { type: "paragraph", text: "Primero" },
        { type: "paragraph", text: "Segundo" },
      ],
    });
    await seedSession(page, ADMIN_ROLES);
    let patchBody: unknown = null;
    await page.route(`${LEARN_API}/articles/${article.articleId}`, (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = route.request().postDataJSON();
        return fulfillJson(route, {
          ...article,
          ...(patchBody as object),
          version: 2,
          readingMinutes: 3,
          updatedAt: "2026-09-21T10:00:00.000Z",
        });
      }
      return fulfillJson(route, article);
    });

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await expect(page.getByTestId("article-save")).toBeDisabled();

    const items = page.getByTestId("block-editor-item");
    await items.nth(1).getByTestId("block-move-up").click();
    await page.getByTestId("block-add-callout").click();
    await items
      .nth(2)
      .getByTestId("block-field")
      .fill("Consulta si duele mucho.");
    await expect(page.getByTestId("article-unsaved-hint")).toBeVisible();
    // Workflow actions wait for the save.
    await expect(page.getByTestId("article-submit")).toBeDisabled();

    await page.getByTestId("article-save").click();
    await expect(page.getByTestId("article-version")).toHaveText("v2");
    await expect(page.getByTestId("article-reading-minutes")).toContainText(
      "3 min",
    );
    expect(patchBody).toEqual({
      body: [
        { type: "paragraph", text: "Segundo" },
        { type: "paragraph", text: "Primero" },
        {
          type: "callout",
          tone: "see_doctor",
          text: "Consulta si duele mucho.",
        },
      ],
    });
  });

  test("409 CONCURRENT_MODIFICATION avisa y recarga la última versión", async ({
    page,
  }) => {
    const article = buildArticle();
    const newer = { ...article, title: "Título de otra persona", version: 2 };
    await seedSession(page, ADMIN_ROLES);
    // A flag, not a call counter: StrictMode fires the first fetch twice in dev.
    let saveAttempted = false;
    await page.route(`${LEARN_API}/articles/${article.articleId}`, (route) => {
      if (route.request().method() === "PATCH") {
        saveAttempted = true;
        return fulfillJson(
          route,
          { code: "CONCURRENT_MODIFICATION", message: "conflict" },
          409,
        );
      }
      return fulfillJson(route, saveAttempted ? newer : article);
    });

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await page.getByTestId("article-title-input").fill("Mi título");
    await page.getByTestId("article-save").click();
    await expect(page.getByTestId("content-mutation-error")).toContainText(
      "Alguien más modificó este contenido",
    );
    await page.getByTestId("content-reload").click();
    await expect(page.getByTestId("article-title-input")).toHaveValue(
      "Título de otra persona",
    );
  });

  test("CHANGES_REQUESTED muestra las notas y permite reenviar", async ({
    page,
  }) => {
    const article = buildArticle({
      status: "CHANGES_REQUESTED",
      version: 2,
      review: {
        ...APPROVAL,
        decision: "request_changes",
        notes: "Agrega una fuente en español.",
      },
    });
    await seedSession(page, ADMIN_ROLES);
    await mockArticle(page, article);
    await page.route(
      `${LEARN_API}/articles/${article.articleId}/submit`,
      (route) =>
        fulfillJson(
          route,
          { code: "MISSING_SOURCES", message: "At least one source" },
          422,
        ),
    );

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await expect(page.getByTestId("review-notes-notice")).toContainText(
      "Agrega una fuente en español.",
    );
    await page.getByTestId("article-submit").click();
    await expect(page.getByTestId("content-mutation-error")).toContainText(
      "Agrega al menos una fuente",
    );
  });

  test("Publicar solo aparece con la aprobación de la versión actual", async ({
    page,
  }) => {
    const approved = buildArticle({
      status: "APPROVED",
      version: 2,
      review: APPROVAL,
    });
    await seedSession(page, ADMIN_ROLES);
    await mockArticle(page, approved);
    await page.route(
      `${LEARN_API}/articles/${approved.articleId}/publish`,
      (route) =>
        fulfillJson(route, {
          ...approved,
          status: "PUBLISHED",
          published: publishedSnapshot(approved, 2),
          updatedAt: "2026-09-21T10:00:00.000Z",
        }),
    );

    await page.goto(`${BASE_URL}/admin/content/${approved.articleId}`);
    await expect(page.getByTestId("approved-notice")).toBeVisible();
    await page.getByTestId("article-publish").click();
    await expect(page.getByTestId("content-status-badge")).toHaveAttribute(
      "data-status",
      "PUBLISHED",
    );
    await expect(page.getByTestId("article-publish")).toHaveCount(0);
    await expect(page.getByTestId("article-slug-input")).toBeDisabled();
  });
});

test.describe("Revisión médica (reviewer)", () => {
  test("ve la vista previa renderizada y aprueba", async ({ page }) => {
    const article = buildArticle({ status: "IN_REVIEW", version: 2 });
    await seedSession(page, REVIEWER_ROLES);
    await mockArticle(page, article);
    let reviewBody: unknown = null;
    await page.route(
      `${LEARN_API}/articles/${article.articleId}/review`,
      (route) => {
        reviewBody = route.request().postDataJSON();
        return fulfillJson(route, {
          ...article,
          status: "APPROVED",
          review: APPROVAL,
          updatedAt: "2026-09-21T10:00:00.000Z",
        });
      },
    );

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);

    // Rendered like the app: bold, highlighted callout, external sources.
    const preview = page.getByTestId("article-preview");
    await expect(
      preview.getByTestId("content-block-paragraph").locator("strong"),
    ).toHaveText("normal");
    await expect(preview.getByTestId("content-block-callout")).toContainText(
      "Consulta a tu médico",
    );
    const source = preview.getByTestId("preview-source-link");
    await expect(source).toHaveAttribute("target", "_blank");
    await expect(source).toHaveAttribute("rel", /noopener/);

    // No admin controls for the reviewer.
    await expect(page.getByTestId("article-editor")).toHaveCount(0);
    await expect(page.getByTestId("article-mode-edit")).toHaveCount(0);
    await expect(page.getByTestId("article-save")).toHaveCount(0);
    await expect(page.getByTestId("article-publish")).toHaveCount(0);
    await expect(page.getByTestId("article-archive")).toHaveCount(0);

    await page.getByTestId("article-approve").click();
    await expect(page.getByTestId("content-status-badge")).toHaveAttribute(
      "data-status",
      "APPROVED",
    );
    expect(reviewBody).toEqual({ decision: "approve" });
    // Approved: the review panel goes away and Publicar never shows up for her.
    await expect(page.getByTestId("article-review-panel")).toHaveCount(0);
    await expect(page.getByTestId("article-publish")).toHaveCount(0);
  });

  test("pedir cambios exige notas antes de llamar a la API", async ({
    page,
  }) => {
    const article = buildArticle({ status: "IN_REVIEW", version: 2 });
    await seedSession(page, REVIEWER_ROLES);
    await mockArticle(page, article);
    let reviewCalls = 0;
    await page.route(
      `${LEARN_API}/articles/${article.articleId}/review`,
      (route) => {
        reviewCalls += 1;
        return fulfillJson(route, {
          ...article,
          status: "CHANGES_REQUESTED",
          review: {
            ...APPROVAL,
            decision: "request_changes",
            notes: "Cita la fuente.",
          },
          updatedAt: "2026-09-21T10:00:00.000Z",
        });
      },
    );

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await page.getByTestId("article-request-changes").click();
    await expect(page.getByTestId("article-review-notes-error")).toBeVisible();
    expect(reviewCalls).toBe(0);

    await page.getByTestId("article-review-notes").fill("Cita la fuente.");
    await page.getByTestId("article-request-changes").click();
    await expect(page.getByTestId("review-notes-notice")).toContainText(
      "Cita la fuente.",
    );
    expect(reviewCalls).toBe(1);
  });

  test("compara la versión publicada con la propuesta", async ({ page }) => {
    const published = buildArticle();
    const article = {
      ...published,
      status: "IN_REVIEW" as const,
      version: 3,
      body: [
        ...published.body,
        { type: "paragraph" as const, text: "Párrafo nuevo en esta versión." },
      ],
      published: publishedSnapshot(published, 2),
    };
    await seedSession(page, REVIEWER_ROLES);
    await mockArticle(page, article);

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);

    const proposed = page.getByTestId("article-preview-proposed");
    await expect(proposed.locator("[data-highlighted]")).toHaveCount(1);
    await expect(proposed.locator("[data-highlighted]")).toContainText(
      "Párrafo nuevo",
    );
    await page.getByTestId("comparison-published").click();
    await expect(
      page.getByTestId("article-preview-published"),
    ).not.toContainText("Párrafo nuevo");
    await page.getByTestId("comparison-side_by_side").click();
    await expect(page.getByTestId("article-preview-proposed")).toBeVisible();
    await expect(page.getByTestId("article-preview-published")).toBeVisible();
  });

  test("a 375px la revisión es legible sin scroll horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const article = buildArticle({ status: "IN_REVIEW", version: 2 });
    await seedSession(page, REVIEWER_ROLES);
    await mockArticle(page, article);

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await expect(page.getByTestId("article-approve")).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("error al cargar el artículo con reintentar", async ({ page }) => {
    const article = buildArticle();
    await seedSession(page, REVIEWER_ROLES);
    // A flag, not a call counter: StrictMode fires the first fetch twice in dev.
    let failing = true;
    await page.route(`${LEARN_API}/articles/${article.articleId}`, (route) =>
      failing
        ? fulfillJson(route, { message: "Article not found" }, 404)
        : fulfillJson(route, article),
    );

    await page.goto(`${BASE_URL}/admin/content/${article.articleId}`);
    await expect(page.getByTestId("article-error")).toContainText(
      "No encontramos este contenido",
    );
    failing = false;
    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByTestId("article-preview")).toBeVisible();
  });
});
