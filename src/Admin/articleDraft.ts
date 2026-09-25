// Editable copy of an article and the pure helpers that turn it into a PATCH. Relative,
// type-only imports so Playwright specs can import this file directly.
import type {
  ArticleSource,
  ContentBlock,
  LearnArticle,
  LearnPhase,
  UpdateArticlePayload,
} from "../api/learn";
import { isValidSlug } from "../lib/slug";

const MAX_ORDER = 999;

export interface ArticleDraft {
  title: string;
  summary: string;
  phase: LearnPhase;
  // Kept as the raw input value so a half-typed number doesn't jump around.
  order: string;
  slug: string;
  body: ContentBlock[];
  sources: ArticleSource[];
}

export function draftFromArticle(article: LearnArticle): ArticleDraft {
  return {
    title: article.title,
    summary: article.summary,
    phase: article.phase,
    order: String(article.order),
    slug: article.slug,
    body: article.body,
    sources: article.sources,
  };
}

// The list editor keeps blank lines while the admin types; they never reach the API.
function normalizeBlock(block: ContentBlock): ContentBlock {
  if (block.type !== "list") return block;
  return {
    type: "list",
    items: block.items.map((item) => item.trim()).filter(Boolean),
  };
}

function normalizeBody(body: ContentBlock[]): ContentBlock[] {
  return body.map(normalizeBlock);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Only the fields that changed: every PATCH bumps the version, and re-sending the slug of a
// published article is what the API guards with SLUG_LOCKED.
export function buildArticlePatch(
  article: LearnArticle,
  draft: ArticleDraft,
): UpdateArticlePayload {
  const patch: UpdateArticlePayload = {};
  if (draft.title !== article.title) patch.title = draft.title;
  if (draft.summary !== article.summary) patch.summary = draft.summary;
  if (draft.phase !== article.phase) patch.phase = draft.phase;
  if (Number(draft.order) !== article.order) patch.order = Number(draft.order);
  if (draft.slug !== article.slug) patch.slug = draft.slug;
  const body = normalizeBody(draft.body);
  if (!sameJson(body, article.body)) patch.body = body;
  if (!sameJson(draft.sources, article.sources)) patch.sources = draft.sources;
  return patch;
}

export function isDraftDirty(
  article: LearnArticle,
  draft: ArticleDraft,
): boolean {
  return Object.keys(buildArticlePatch(article, draft)).length > 0;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function blockIsEmpty(block: ContentBlock): boolean {
  if (block.type === "list") {
    return block.items.every((item) => item.trim().length === 0);
  }
  return block.text.trim().length === 0;
}

// Mirrors the API's field validation (400s) so the admin gets the reason before saving.
// Editorial completeness (summary, sources, see-doctor callout) is only enforced on submit.
export function validateArticleDraft(draft: ArticleDraft): string | null {
  if (!isValidSlug(draft.slug)) {
    return "El slug solo admite minúsculas, números y guiones.";
  }
  const order = Number(draft.order);
  if (
    draft.order.trim() === "" ||
    !Number.isInteger(order) ||
    order < 0 ||
    order > MAX_ORDER
  ) {
    return `El orden debe ser un número entre 0 y ${MAX_ORDER}.`;
  }
  const emptyBlock = draft.body.findIndex(blockIsEmpty);
  if (emptyBlock !== -1) {
    return `El bloque ${emptyBlock + 1} está vacío. Complétalo o elimínalo.`;
  }
  const invalidSource = draft.sources.findIndex(
    (source) =>
      !source.title.trim() ||
      !source.publisher.trim() ||
      !isHttpUrl(source.url),
  );
  if (invalidSource !== -1) {
    return `La fuente ${invalidSource + 1} necesita título, entidad y una URL válida (https://…).`;
  }
  return null;
}
