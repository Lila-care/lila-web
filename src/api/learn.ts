import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (mirror ms-lila src/learn/learn.types.ts + src/learn/dto/* exactly) ---

export type PhaseName = "MENSTRUATION" | "FOLLICULAR" | "OVULATION" | "LUTEAL";

export type LearnPhase = PhaseName | "GENERAL";

// Display order of the sections in the app (same as the BE's LEARN_PHASES).
export const LEARN_PHASES: readonly LearnPhase[] = [
  "MENSTRUATION",
  "FOLLICULAR",
  "OVULATION",
  "LUTEAL",
  "GENERAL",
];

export const BANNER_PHASES: readonly PhaseName[] = [
  "MENSTRUATION",
  "FOLLICULAR",
  "OVULATION",
  "LUTEAL",
];

export type ContentBlock =
  | { type: "heading"; text: string }
  // `text` may contain **bold** markers; the app renders them.
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone: "see_doctor"; text: string };

export type ContentBlockType = ContentBlock["type"];

export interface ArticleSource {
  title: string;
  url: string;
  publisher: string;
}

export type ReviewStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
];

export type ReviewDecision = "approve" | "request_changes";

export interface ReviewRecord {
  reviewerId: string;
  decision: ReviewDecision;
  notes?: string;
  // The `version` the reviewer actually read — publishing is only allowed while it still
  // matches the entity's current version.
  reviewedVersion: number;
  reviewedAt: string;
}

export interface Reviewable {
  version: number;
  status: ReviewStatus;
  review?: ReviewRecord;
}

export interface PublishedArticle {
  title: string;
  summary: string;
  body: ContentBlock[];
  sources: ArticleSource[];
  readingMinutes: number;
  phase: LearnPhase;
  order: number;
  version: number;
  reviewedAt: string;
  publishedAt: string;
}

export type ArticleOrigin = "ai_draft" | "manual";

export interface LearnArticle extends Reviewable {
  articleId: string;
  slug: string;
  phase: LearnPhase;
  order: number;
  title: string;
  summary: string;
  body: ContentBlock[];
  sources: ArticleSource[];
  readingMinutes: number;
  published?: PublishedArticle;
  archivedAt?: string;
  origin: ArticleOrigin;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedPhaseBanner {
  text: string;
  version: number;
  reviewedAt: string;
  publishedAt: string;
}

export interface PhaseBanner extends Reviewable {
  phase: PhaseName;
  text: string;
  published?: PublishedPhaseBanner;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticlePayload {
  slug: string;
  phase: LearnPhase;
  order?: number;
  title: string;
  summary?: string;
  body?: ContentBlock[];
  sources?: ArticleSource[];
}

export type UpdateArticlePayload = Partial<CreateArticlePayload>;

export interface GenerateDraftPayload {
  phase: LearnPhase;
  title: string;
  brief: string;
  slug?: string;
  order?: number;
}

export interface ReviewDecisionPayload {
  decision: ReviewDecision;
  notes?: string;
}

// Machine-readable codes returned in 4xx/5xx bodies as `{ code, message }`.
export type LearnErrorCode =
  | "SLUG_TAKEN"
  | "SLUG_LOCKED"
  | "INVALID_TRANSITION"
  | "APPROVAL_VERSION_MISMATCH"
  | "NOTES_REQUIRED"
  | "CONCURRENT_MODIFICATION"
  | "MISSING_SOURCES"
  | "MISSING_SEE_DOCTOR_CALLOUT"
  | "EMPTY_TITLE"
  | "EMPTY_SUMMARY"
  | "EMPTY_BODY"
  | "EMPTY_TEXT"
  | "INSUFFICIENT_SOURCES"
  | "DRAFT_GENERATION_FAILED";

const LEARN_ERROR_CODES: readonly string[] = [
  "SLUG_TAKEN",
  "SLUG_LOCKED",
  "INVALID_TRANSITION",
  "APPROVAL_VERSION_MISMATCH",
  "NOTES_REQUIRED",
  "CONCURRENT_MODIFICATION",
  "MISSING_SOURCES",
  "MISSING_SEE_DOCTOR_CALLOUT",
  "EMPTY_TITLE",
  "EMPTY_SUMMARY",
  "EMPTY_BODY",
  "EMPTY_TEXT",
  "INSUFFICIENT_SOURCES",
  "DRAFT_GENERATION_FAILED",
];

// Carries the HTTP status and, when the BE sent one, the Learn error `code` so screens can
// react to specific failures (e.g. offer a reload on CONCURRENT_MODIFICATION).
export class LearnApiError extends Error {
  readonly status: number;
  readonly code: LearnErrorCode | null;

  constructor(status: number, code: LearnErrorCode | null, message: string) {
    super(message);
    this.name = "LearnApiError";
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  code?: unknown;
  // Learn errors send a string; Nest's ValidationPipe sends a string[].
  message?: unknown;
}

function isLearnErrorCode(value: unknown): value is LearnErrorCode {
  return typeof value === "string" && LEARN_ERROR_CODES.includes(value);
}

function describeMessage(message: unknown, status: number): string {
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string" && message) return message;
  return `HTTP ${status}`;
}

async function toLearnApiError(res: Response): Promise<LearnApiError> {
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  return new LearnApiError(
    res.status,
    isLearnErrorCode(body.code) ? body.code : null,
    describeMessage(body.message, res.status),
  );
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await authFetch(`${BASE_URL}/admin/learn${path}`, {
    method: init.method ?? "GET",
    headers: authHeaders(token),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) throw await toLearnApiError(res);
  return res.json() as Promise<T>;
}

// --- Articles ---

export function listArticles(
  token: string,
  status?: ReviewStatus,
): Promise<LearnArticle[]> {
  const query = status ? `?status=${status}` : "";
  return request<LearnArticle[]>(token, `/articles${query}`);
}

export function getArticle(
  token: string,
  articleId: string,
): Promise<LearnArticle> {
  return request<LearnArticle>(token, `/articles/${articleId}`);
}

export function createArticle(
  token: string,
  payload: CreateArticlePayload,
): Promise<LearnArticle> {
  return request<LearnArticle>(token, "/articles", {
    method: "POST",
    body: payload,
  });
}

export function generateArticleDraft(
  token: string,
  payload: GenerateDraftPayload,
): Promise<LearnArticle> {
  return request<LearnArticle>(token, "/articles/draft", {
    method: "POST",
    body: payload,
  });
}

export function updateArticle(
  token: string,
  articleId: string,
  payload: UpdateArticlePayload,
): Promise<LearnArticle> {
  return request<LearnArticle>(token, `/articles/${articleId}`, {
    method: "PATCH",
    body: payload,
  });
}

export type ArticleTransition = "submit" | "publish" | "archive";

export function transitionArticle(
  token: string,
  articleId: string,
  transition: ArticleTransition,
): Promise<LearnArticle> {
  return request<LearnArticle>(token, `/articles/${articleId}/${transition}`, {
    method: "POST",
  });
}

export function reviewArticle(
  token: string,
  articleId: string,
  payload: ReviewDecisionPayload,
): Promise<LearnArticle> {
  return request<LearnArticle>(token, `/articles/${articleId}/review`, {
    method: "POST",
    body: payload,
  });
}

// --- Phase banners ---

export function listPhaseBanners(token: string): Promise<PhaseBanner[]> {
  return request<PhaseBanner[]>(token, "/phase-banners");
}

export function updatePhaseBanner(
  token: string,
  phase: PhaseName,
  text: string,
): Promise<PhaseBanner> {
  return request<PhaseBanner>(token, `/phase-banners/${phase}`, {
    method: "PUT",
    body: { text },
  });
}

export type BannerTransition = "submit" | "publish";

export function transitionPhaseBanner(
  token: string,
  phase: PhaseName,
  transition: BannerTransition,
): Promise<PhaseBanner> {
  return request<PhaseBanner>(token, `/phase-banners/${phase}/${transition}`, {
    method: "POST",
  });
}

export function reviewPhaseBanner(
  token: string,
  phase: PhaseName,
  payload: ReviewDecisionPayload,
): Promise<PhaseBanner> {
  return request<PhaseBanner>(token, `/phase-banners/${phase}/review`, {
    method: "POST",
    body: payload,
  });
}
