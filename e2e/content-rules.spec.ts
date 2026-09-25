// Unit tests for the pure rules behind the admin Content section. The repo has no unit test
// runner, so they run on Playwright's test runner without a browser page.
import { test, expect } from "@playwright/test";
import {
  adminHomePath,
  canSeeAdminSection,
  isMedicalReviewerOnly,
  readRolesFromIdToken,
} from "../src/lib/adminRoles";
import {
  getContentActions,
  isPublishable,
  validateReviewNotes,
} from "../src/Admin/contentPermissions";
import { parseBoldSegments } from "../src/lib/inlineBold";
import {
  buildArticlePatch,
  draftFromArticle,
  validateArticleDraft,
} from "../src/Admin/articleDraft";
import { slugify } from "../src/lib/slug";
import type { LearnArticle, Reviewable } from "../src/api/learn";

const ADMIN = ["admin"];
const REVIEWER = ["medical_reviewer"];
const BOTH = ["admin", "medical_reviewer"];

function reviewable(overrides: Partial<Reviewable> = {}): Reviewable {
  return { version: 2, status: "DRAFT", ...overrides };
}

const APPROVED_CURRENT = reviewable({
  status: "APPROVED",
  review: {
    reviewerId: "rev-1",
    decision: "approve",
    reviewedVersion: 2,
    reviewedAt: "2026-09-20T10:00:00.000Z",
  },
});

test.describe("adminRoles", () => {
  test("lee cognito:groups del ID token (base64url)", () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: "u1", "cognito:groups": ["medical_reviewer"] }),
    ).toString("base64url");
    expect(readRolesFromIdToken(`h.${payload}.s`)).toEqual([
      "medical_reviewer",
    ]);
    expect(readRolesFromIdToken("not-a-jwt")).toEqual([]);
    expect(readRolesFromIdToken(null)).toEqual([]);
  });

  test("la reviewer sin admin aterriza en Contenido y solo ve esa sección", () => {
    expect(isMedicalReviewerOnly(REVIEWER)).toBe(true);
    expect(isMedicalReviewerOnly(BOTH)).toBe(false);
    expect(adminHomePath(REVIEWER)).toBe("/admin/content");
    expect(adminHomePath(ADMIN)).toBe("/admin/dashboard");
    expect(adminHomePath(BOTH)).toBe("/admin/dashboard");
    expect(canSeeAdminSection(REVIEWER, "/admin/content")).toBe(true);
    expect(canSeeAdminSection(REVIEWER, "/admin/users")).toBe(false);
    expect(canSeeAdminSection(ADMIN, "/admin/users")).toBe(true);
    // No groups at all keeps today's behavior (no FE role check on other sections).
    expect(canSeeAdminSection([], "/admin/users")).toBe(true);
  });
});

test.describe("contentPermissions", () => {
  test("admin: edita/envía/archiva pero no revisa", () => {
    const actions = getContentActions(reviewable({ status: "DRAFT" }), ADMIN);
    expect(actions).toEqual({
      canEdit: true,
      canSubmit: true,
      canPublish: false,
      canArchive: true,
      canReview: false,
    });
    expect(
      getContentActions(reviewable({ status: "IN_REVIEW" }), ADMIN).canReview,
    ).toBe(false);
  });

  test("reviewer: solo revisa, y solo en IN_REVIEW", () => {
    expect(
      getContentActions(reviewable({ status: "IN_REVIEW" }), REVIEWER),
    ).toEqual({
      canEdit: false,
      canSubmit: false,
      canPublish: false,
      canArchive: false,
      canReview: true,
    });
    expect(getContentActions(APPROVED_CURRENT, REVIEWER).canPublish).toBe(
      false,
    );
    expect(
      getContentActions(reviewable({ status: "DRAFT" }), REVIEWER).canReview,
    ).toBe(false);
  });

  test("ambos roles: todas las acciones que aplican al estado", () => {
    const inReview = getContentActions(
      reviewable({ status: "IN_REVIEW" }),
      BOTH,
    );
    expect(inReview.canReview).toBe(true);
    expect(inReview.canEdit).toBe(true);
    expect(inReview.canSubmit).toBe(false);
    expect(getContentActions(APPROVED_CURRENT, BOTH).canPublish).toBe(true);
  });

  test("Publicar solo con APPROVED y la aprobación de la versión actual", () => {
    expect(isPublishable(APPROVED_CURRENT)).toBe(true);
    expect(isPublishable({ ...APPROVED_CURRENT, version: 3 })).toBe(false);
    expect(isPublishable({ ...APPROVED_CURRENT, status: "IN_REVIEW" })).toBe(
      false,
    );
    expect(isPublishable({ ...APPROVED_CURRENT, review: undefined })).toBe(
      false,
    );
    expect(
      isPublishable({
        ...APPROVED_CURRENT,
        review: { ...APPROVED_CURRENT.review!, decision: "request_changes" },
      }),
    ).toBe(false);
    expect(getContentActions(APPROVED_CURRENT, ADMIN).canPublish).toBe(true);
    expect(
      getContentActions({ ...APPROVED_CURRENT, version: 3 }, ADMIN).canPublish,
    ).toBe(false);
  });

  test("Archivar no se ofrece si ya está archivado", () => {
    expect(
      getContentActions(reviewable({ status: "ARCHIVED" }), ADMIN).canArchive,
    ).toBe(false);
  });

  test("notas obligatorias solo para pedir cambios", () => {
    expect(validateReviewNotes("request_changes", "   ")).not.toBeNull();
    expect(validateReviewNotes("request_changes", "Falta fuente")).toBeNull();
    expect(validateReviewNotes("approve", "")).toBeNull();
  });
});

test.describe("parseBoldSegments", () => {
  test("separa **negrita** del texto plano", () => {
    expect(parseBoldSegments("Es **normal** sentir **cansancio**.")).toEqual([
      { text: "Es ", bold: false },
      { text: "normal", bold: true },
      { text: " sentir ", bold: false },
      { text: "cansancio", bold: true },
      { text: ".", bold: false },
    ]);
  });

  test("un ** sin cerrar queda como texto literal", () => {
    expect(parseBoldSegments("sin **cerrar")).toEqual([
      { text: "sin **cerrar", bold: false },
    ]);
  });
});

test.describe("articleDraft", () => {
  const article: LearnArticle = {
    articleId: "a1",
    slug: "fase-lutea",
    phase: "LUTEAL",
    order: 1,
    title: "Fase lútea",
    summary: "Resumen",
    body: [{ type: "paragraph", text: "Hola" }],
    sources: [{ title: "T", url: "https://medlineplus.gov/x", publisher: "P" }],
    readingMinutes: 1,
    version: 1,
    status: "DRAFT",
    origin: "manual",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
  };

  test("el PATCH solo lleva lo que cambió (nunca re-envía el slug)", () => {
    const draft = { ...draftFromArticle(article), title: "Nuevo" };
    expect(buildArticlePatch(article, draft)).toEqual({ title: "Nuevo" });
    expect(buildArticlePatch(article, draftFromArticle(article))).toEqual({});
  });

  test("las líneas vacías de una lista no llegan a la API", () => {
    const draft = {
      ...draftFromArticle(article),
      body: [{ type: "list" as const, items: ["uno", "", " dos "] }],
    };
    expect(buildArticlePatch(article, draft).body).toEqual([
      { type: "list", items: ["uno", "dos"] },
    ]);
  });

  test("valida slug, orden, bloques vacíos y URLs de fuentes", () => {
    const base = draftFromArticle(article);
    expect(validateArticleDraft(base)).toBeNull();
    expect(
      validateArticleDraft({ ...base, slug: "Fase Lútea" }),
    ).not.toBeNull();
    expect(validateArticleDraft({ ...base, order: "1000" })).not.toBeNull();
    expect(
      validateArticleDraft({ ...base, body: [{ type: "heading", text: " " }] }),
    ).toContain("bloque 1");
    expect(
      validateArticleDraft({
        ...base,
        sources: [{ title: "T", url: "no-es-url", publisher: "P" }],
      }),
    ).toContain("fuente 1");
  });

  test("slugify quita tildes y espacios", () => {
    expect(slugify("Síntomas del ciclo")).toBe("sintomas-del-ciclo");
  });
});
