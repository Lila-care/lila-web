// Shared fixtures + API mocks for the admin Content (Learn) specs. Every call to ms-lila is
// mocked with page.route — nothing here touches real data.
import type { Page, Route } from "@playwright/test";
import type { LearnArticle, PhaseBanner } from "../../src/api/learn";

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
export const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";
export const LEARN_API = `${API_URL}/admin/learn`;

export const ADMIN_ROLES = ["admin"];
export const REVIEWER_ROLES = ["medical_reviewer"];

export async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Standard base64 (not base64url): AuthContext decodes the payload with plain `atob`.
export function fakeIdToken(groups: string[]): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64");
  const payload = {
    sub: `user-${groups.join("-") || "none"}`,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "e2e@lila.app",
    "cognito:groups": groups,
  };
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.fakesignature`;
}

export async function seedSession(page: Page, groups: string[]) {
  await page.goto(`${BASE_URL}/terms`);
  await page.evaluate(
    (token) => localStorage.setItem("lila_id_token", token),
    fakeIdToken(groups),
  );
}

const NOW = "2026-09-20T15:00:00.000Z";

export function buildArticle(
  overrides: Partial<LearnArticle> = {},
): LearnArticle {
  return {
    articleId: "7f0c3a52-1d5e-4b8a-9c11-2f6f0e7a0001",
    slug: "fase-lutea-energia",
    phase: "LUTEAL",
    order: 1,
    title: "Tu energía en la fase lútea",
    summary: "Qué cambia en tu cuerpo antes del período.",
    body: [
      { type: "heading", text: "Qué pasa" },
      {
        type: "paragraph",
        text: "Es **normal** sentir más cansancio estos días.",
      },
      { type: "list", items: ["Duerme bien", "Hidrátate"] },
      {
        type: "callout",
        tone: "see_doctor",
        text: "Si el dolor no te deja hacer tu vida normal, consulta.",
      },
    ],
    sources: [
      {
        title: "Premenstrual syndrome",
        url: "https://medlineplus.gov/premenstrualsyndrome.html",
        publisher: "MedlinePlus",
      },
    ],
    readingMinutes: 2,
    version: 1,
    status: "DRAFT",
    origin: "manual",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function buildBanner(overrides: Partial<PhaseBanner> = {}): PhaseBanner {
  return {
    phase: "LUTEAL",
    text: "Baja el ritmo: tu cuerpo lo agradece.",
    version: 1,
    status: "DRAFT",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

// The dashboard the admin lands on fires its own calls — keep them quiet so no unmocked
// request hits the network.
export async function mockAdminShell(page: Page) {
  await page.route(`${API_URL}/admin/dashboard/**`, (route) =>
    fulfillJson(route, {}),
  );
}
