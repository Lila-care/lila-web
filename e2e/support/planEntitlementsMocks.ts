// Shared fixtures for the plan "Características" (entitlements) specs. Every call to ms-lila is
// mocked with page.route — nothing here touches real data. The catalog is a representative
// copy of the 11-key GET /admin/subscription/features catalog (labels from the Figma frames).
import type { Page, Route } from "@playwright/test";
import type { EntitlementMap, FeatureDefinition } from "../../src/api/plans";

export const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

export const FEATURE_CATALOG: FeatureDefinition[] = [
  {
    key: "daily_chat_messages",
    label: "Mensajes con Lila por día",
    description: "Cantidad de mensajes disponibles cada día.",
    section: "chat",
    type: "limit",
    unit: "per_day",
    default: null,
    enforced: true,
  },
  {
    key: "advanced_model",
    label: "Modelo de IA avanzado",
    description: "Acceso al modelo avanzado de conversación.",
    section: "chat",
    type: "flag",
    default: false,
    enforced: true,
  },
  {
    key: "chat_history_days",
    label: "Historial de conversaciones",
    description: "Días de conversaciones que se pueden consultar.",
    section: "chat",
    type: "limit",
    unit: "days",
    default: null,
    enforced: true,
  },
  {
    key: "learn_access",
    label: "Acceso a Aprende",
    description: "Permite leer el contenido de Aprende.",
    section: "learn",
    type: "flag",
    default: true,
    enforced: true,
  },
  {
    key: "learn_articles_per_month",
    label: "Artículos de Aprende por mes",
    description: "Cantidad de artículos disponibles cada mes.",
    section: "learn",
    type: "limit",
    unit: "per_month",
    default: null,
    enforced: true,
  },
  {
    key: "ai_reports",
    label: "Reportes del ciclo con IA",
    description: "Permite consultar reportes del ciclo con IA.",
    section: "cycle",
    type: "flag",
    default: true,
    enforced: true,
  },
  {
    key: "cycle_history_cycles",
    label: "Ciclos visibles en el historial",
    description: "Cantidad de ciclos anteriores que se pueden ver.",
    section: "cycle",
    type: "limit",
    unit: "cycles",
    default: null,
    enforced: true,
  },
  {
    key: "fertility_insights",
    label: "Ventana fértil y ovulación",
    description: "Permite consultar estimaciones de fertilidad.",
    section: "cycle",
    type: "flag",
    default: true,
    enforced: true,
  },
  {
    key: "doctor_report_pdf",
    label: "Reporte PDF para la consulta",
    description: "Exportación del reporte para una consulta.",
    section: "cycle",
    type: "flag",
    default: null,
    enforced: false,
  },
  {
    key: "gyn_consults_per_month",
    label: "Consultas con ginecóloga",
    description: "Cantidad de consultas disponibles cada mes.",
    section: "cycle",
    type: "limit",
    unit: "per_month",
    default: null,
    enforced: false,
  },
  {
    key: "partner_sharing",
    label: "Compartir con pareja",
    description: "Cantidad de perfiles con acceso compartido.",
    section: "cycle",
    type: "limit",
    unit: "profiles",
    default: null,
    enforced: false,
  },
];

export interface EntitlementPlan {
  planId: string;
  name: string;
  amountInCents: number;
  currency: "COP";
  intervalDays: number | null;
  status: "active" | "inactive" | "coming_soon";
  features: string[];
  entitlements: EntitlementMap;
  maxInteractionsPerDay: number | null;
}

export function defaultEntitlements(): EntitlementMap {
  return Object.fromEntries(FEATURE_CATALOG.map((f) => [f.key, f.default]));
}

export function buildEntitlementPlan(
  overrides: Partial<EntitlementPlan> = {},
): EntitlementPlan {
  const entitlements = {
    ...defaultEntitlements(),
    daily_chat_messages: 30,
    ...(overrides.entitlements ?? {}),
  };
  return {
    planId: "plan-1",
    name: "Plan Mensual",
    amountInCents: 2_990_000,
    currency: "COP",
    intervalDays: 30,
    status: "active",
    features: [],
    maxInteractionsPerDay: entitlements.daily_chat_messages as number | null,
    ...overrides,
    entitlements,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export interface PlanMutation {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

interface MockOptions {
  plans?: EntitlementPlan[];
  // /features answers 500 while true; flip it later with `setFeaturesFailing`.
  featuresFailing?: boolean;
  // Subscribers per planId, served by GET /admin/subscription/stats (byPlan).
  subscribers?: Record<string, number>;
  // past_due subscribers per planId: counted in `count`, never in `activeCount`.
  pastDue?: Record<string, number>;
  // Old BE: byPlan items without `activeCount`.
  legacyStats?: boolean;
  // /stats answers 500 while true.
  statsFailing?: boolean;
  // When set, plan mutations answer 400 with this `errors` array.
  rejectMutationsWith?: string[];
}

// Stateful mock of plans + features + discounts (empty). PATCH merges `entitlements` by key like
// the BE does, so the refetch after a save shows the merged map.
export async function mockEntitlementsApi(
  page: Page,
  options: MockOptions = {},
) {
  const plans = [...(options.plans ?? [])];
  const mutations: PlanMutation[] = [];
  let featuresFailing = options.featuresFailing ?? false;
  let statsFailing = options.statsFailing ?? false;

  await page.route(`${API_URL}/admin/subscription/**`, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === "/admin/subscription/features") {
      if (featuresFailing) {
        return fulfillJson(route, { message: "boom" }, 500);
      }
      return fulfillJson(route, FEATURE_CATALOG);
    }
    if (path === "/admin/subscription/stats") {
      if (statsFailing) return fulfillJson(route, { message: "boom" }, 500);
      return fulfillJson(route, statsBody(plans, options));
    }
    if (path === "/admin/subscription/discounts" && method === "GET") {
      return fulfillJson(route, []);
    }
    if (path === "/admin/subscription/plans" && method === "GET") {
      return fulfillJson(route, plans);
    }
    if (method === "POST" || method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      mutations.push({ method, path, body });
      if (options.rejectMutationsWith) {
        return fulfillJson(
          route,
          { message: "Validation failed", errors: options.rejectMutationsWith },
          400,
        );
      }
      return applyMutation(route, plans, method, path, body);
    }
    return route.continue();
  });

  return {
    mutations,
    setFeaturesFailing: (failing: boolean) => {
      featuresFailing = failing;
    },
    setStatsFailing: (failing: boolean) => {
      statsFailing = failing;
    },
  };
}

function statsBody(plans: EntitlementPlan[], options: MockOptions) {
  const byPlan = plans.map((p) => {
    const active = options.subscribers?.[p.planId] ?? 0;
    const count = active + (options.pastDue?.[p.planId] ?? 0);
    const base = { planId: p.planId, planName: p.name, count };
    return options.legacyStats ? base : { ...base, activeCount: active };
  });
  const total = byPlan.reduce((sum, p) => sum + p.count, 0);
  return {
    totalSubscribers: total,
    byStatus: { active: total, past_due: 0, canceled: 0 },
    byPlan,
    mrrInCents: 0,
  };
}

function applyMutation(
  route: Route,
  plans: EntitlementPlan[],
  method: string,
  path: string,
  body: Record<string, unknown>,
) {
  const patch = body.entitlements as EntitlementMap | undefined;
  if (method === "POST") {
    const created = buildEntitlementPlan({
      planId: `plan-${plans.length + 1}`,
      name: body.name as string,
      amountInCents: body.amountInCents as number,
      intervalDays: (body.intervalDays as number | null | undefined) ?? null,
      entitlements: { ...defaultEntitlements(), ...(patch ?? {}) },
    });
    plans.push(created);
    return fulfillJson(route, created, 201);
  }
  const index = plans.findIndex((p) => path.endsWith(`/${p.planId}`));
  if (index === -1) return fulfillJson(route, { message: "not found" }, 404);
  const { entitlements: _ignored, ...rest } = body;
  void _ignored;
  plans[index] = {
    ...plans[index],
    ...(rest as Partial<EntitlementPlan>),
    entitlements: { ...plans[index].entitlements, ...(patch ?? {}) },
  };
  return fulfillJson(route, plans[index]);
}
