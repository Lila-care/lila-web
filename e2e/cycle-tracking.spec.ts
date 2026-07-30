import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.VITE_API_URL ?? "http://localhost:6100";

const CONFIG_BODY = { freeQuestionLimit: 3, upgradePromptLimit: 10 };
const AGENT_ME_BODY = {
  userId: "test-user",
  templateVersion: 1,
  isGuest: false,
  hasActiveTemplate: true,
  freeQuestionLimit: 3,
  onboarding: { pending: false },
};

// Builds an unsigned JWT-shaped token (header.payload.signature) — the app only base64-decodes
// the payload client-side, it never verifies the signature, so a fake signature is enough.
function fakeIdToken(claims: Record<string, unknown> = {}): string {
  const header = { alg: "none", typ: "JWT" };
  const payload = {
    sub: "test-user",
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "valentina@lila.app",
    name: "Valentina",
    ...claims,
  };
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.fakesignature`;
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function seedAuthToken(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t) => localStorage.setItem("lila_id_token", t), token);
}

function periodSummaryBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    currentDate: "2026-07-10",
    cycleId: "cycle-1",
    lastPeriod: { start: "2026-07-08", length: 5 },
    cycle: {
      averageLength: 28,
      predictedNextStart: "2026-08-05",
      confidence: 0.8,
      predictedOvulation: "2026-07-22",
      ovulationConfidence: 0.7,
      averageLutealLength: 14,
      fertileWindowStart: "2026-07-19",
      fertileWindowEnd: "2026-07-23",
      currentCycleDay: 3,
    },
    activePeriod: { isActive: true, day: 3 },
    ...overrides,
  };
}

// Devuelve un día por fecha en el rango [start, end] (inclusive) — usado para mockear
// GET /moon-phase/range?start=...&end=.... Iluminación fija en 100 (luna llena) para que
// el ícono "notable" de la grilla (>=97%) y el bloque de detalle sean deterministas en los
// tests, sin depender de la fecha real del sistema.
function moonRangeBody(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days: Array<{ date: string; phaseName: string; illumination: number }> =
    [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    days.push({
      date: cursor.toISOString().slice(0, 10),
      phaseName: "Luna llena",
      illumination: 100,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

async function mockMoonPhaseRange(page: Page) {
  await page.route(`${API_URL}/moon-phase/range*`, (route) => {
    const url = new URL(route.request().url());
    const start = url.searchParams.get("start") ?? "2026-07-01";
    const end = url.searchParams.get("end") ?? "2026-07-31";
    return fulfillJson(route, moonRangeBody(start, end));
  });
}

function weekMetricsBody(todayDate: string) {
  const dayOfWeekNames = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;
  const today = new Date(`${todayDate}T00:00:00Z`);
  const sunday = new Date(today);
  sunday.setUTCDate(today.getUTCDate() - today.getUTCDay());

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setUTCDate(sunday.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return {
      isToday: iso === todayDate,
      dayOfWeekIndex: i,
      dayOfWeek: dayOfWeekNames[i],
      phaseName: i < 3 ? "MENSTRUATION" : i < 5 ? "FOLLICULAR" : null,
      date: iso,
    };
  });
}

async function mockAuthenticatedShell(page: Page) {
  await page.route(`${API_URL}/lila/config`, (route) =>
    fulfillJson(route, CONFIG_BODY),
  );
  await page.route(`${API_URL}/lila/agent/me`, (route) =>
    fulfillJson(route, AGENT_ME_BODY),
  );
  await page.route(`${API_URL}/lila/conversations`, (route) =>
    fulfillJson(route, []),
  );
  await page.route(`${API_URL}/period/summary`, (route) =>
    fulfillJson(route, periodSummaryBody()),
  );
  await page.route(`${API_URL}/user-phase/metrics/*`, (route) => {
    const url = new URL(route.request().url());
    const date = url.pathname.split("/").pop() ?? "2026-07-10";
    return fulfillJson(route, weekMetricsBody(date));
  });
  await mockMoonPhaseRange(page);
}

test.describe("Cycle tracking — navegación por sidebar", () => {
  test("navega por las 6 rutas y resalta el item activo", async ({ page }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/today`);
    await expect(page.getByTestId("nav-item-today")).toBeVisible();

    const routes: Array<{ href: string; navTestId: string }> = [
      { href: "/chat", navTestId: "nav-item-chat" },
      { href: "/calendar", navTestId: "nav-item-calendar" },
      { href: "/learn", navTestId: "nav-item-learn" },
      { href: "/profile", navTestId: "nav-item-profile" },
      { href: "/today", navTestId: "nav-item-today" },
    ];

    for (const { href, navTestId } of routes) {
      await page.getByTestId(navTestId).click();
      await page.waitForURL(`${BASE_URL}${href}`);
      // El item activo del sidebar tiene fondo lila sólido (#9B72C8) vía inline style.
      await expect(page.getByTestId(navTestId)).toHaveCSS(
        "background-color",
        "rgb(155, 114, 200)",
      );
    }
  });

  test("link Diario está deshabilitado y no navega", async ({ page }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/today`);

    const diario = page.getByTestId("nav-item-diario");
    await expect(diario).toBeVisible();
    await expect(diario).toHaveAttribute("aria-disabled", "true");
    await diario.click({ force: true });
    // No navegó — seguimos en /today.
    await expect(page).toHaveURL(`${BASE_URL}/today`);
  });
});

test.describe("/today", () => {
  test("muestra el día y la fase del ciclo con datos mockeados", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/today`);

    await expect(page.getByTestId("phase-hero-card")).toBeVisible();
    await expect(page.getByTestId("phase-hero-cycle-day")).toContainText(
      "Día 3",
    );
    await expect(page.getByTestId("week-strip")).toBeVisible();
    await expect(page.getByTestId("week-strip-day")).toHaveCount(7);
  });

  test("botón Registrar síntomas está deshabilitado y no dispara requests", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    let symptomsRequestFired = false;
    await page.route(`${API_URL}/**/symptoms*`, (route) => {
      symptomsRequestFired = true;
      return route.abort();
    });

    await page.goto(`${BASE_URL}/today`);

    const button = page.getByTestId("quick-action-symptoms");
    await expect(button).toBeDisabled();
    await button.click({ force: true });
    expect(symptomsRequestFired).toBe(false);
  });

  // Cubre la migración del widget de luna de PhaseHeroCard (cálculo sinódico client-side,
  // src/lib/moonPhase.ts, ya eliminado) a datos reales de GET /moon-phase/range — a diferencia
  // de useCalendar (rango del mes completo), acá se pide un rango de un solo día (start=end=hoy).
  test("el widget de luna pide el rango de un solo día (hoy) y muestra el dato real de /moon-phase/range", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);

    const requestedRanges: Array<{ start: string; end: string }> = [];
    await page.route(`${API_URL}/moon-phase/range*`, (route) => {
      const url = new URL(route.request().url());
      const start = url.searchParams.get("start") ?? "";
      const end = url.searchParams.get("end") ?? "";
      requestedRanges.push({ start, end });
      return fulfillJson(route, moonRangeBody(start, end));
    });
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/today`);
    await page.waitForLoadState("networkidle");

    expect(requestedRanges.length).toBeGreaterThanOrEqual(1);
    for (const range of requestedRanges) {
      expect(range.start).toBe(range.end);
      expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }

    const moonWidget = page.getByTestId("moon-phase-widget");
    await expect(moonWidget).toBeVisible();
    await expect(moonWidget).toContainText("Luna llena");
    await expect(moonWidget).toContainText("100% visible");
    await expect(page.getByTestId("moon-phase-widget-loading")).toHaveCount(0);
  });

  test("si /moon-phase/range falla, el widget de luna se oculta sin bloquear el resto de la tarjeta", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await page.route(`${API_URL}/moon-phase/range*`, (route) => route.abort());
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/today`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("phase-hero-card")).toBeVisible();
    await expect(page.getByTestId("phase-hero-cycle-day")).toContainText(
      "Día 3",
    );
    await expect(page.getByTestId("moon-phase-widget")).toHaveCount(0);
    await expect(page.getByTestId("moon-phase-widget-loading")).toHaveCount(0);
    await expect(page.getByTestId("today-error")).toHaveCount(0);
  });
});

test.describe("/calendar", () => {
  test("muestra la grilla del mes y el panel de detalle del día actual", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);

    await expect(page.getByTestId("month-grid")).toBeVisible();
    const dayCells = page.getByTestId("calendar-day-cell");
    await expect(dayCells.first()).toBeVisible();
    await expect(page.getByTestId("day-detail-panel")).toBeVisible();
  });

  test("botón Añadir registro está deshabilitado y no dispara requests", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    let addRecordFired = false;
    await page.route(`${API_URL}/**/records*`, (route) => {
      addRecordFired = true;
      return route.abort();
    });

    await page.goto(`${BASE_URL}/calendar`);

    const button = page.getByTestId("add-record-button");
    await expect(button).toBeDisabled();
    await button.click({ force: true });
    expect(addRecordFired).toBe(false);
  });

  test("toggle Ambos/Ciclo/Luna filtra lo que muestran la grilla y el panel de detalle", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);

    // "Ambos" es el default — leyenda de fases y bloque de luna visibles.
    await expect(page.getByTestId("view-mode-both")).toBeVisible();
    await expect(page.getByTestId("phase-legend")).toBeVisible();
    await expect(page.getByTestId("day-detail-moon-block")).toBeVisible();

    // "Ciclo" — mantiene la leyenda de fases, oculta el bloque de luna del panel de detalle.
    await page.getByTestId("view-mode-cycle").click();
    await expect(page.getByTestId("phase-legend")).toBeVisible();
    await expect(page.getByTestId("day-detail-moon-block")).toHaveCount(0);
    await expect(page.getByTestId("day-detail-panel")).toBeVisible();

    // "Luna" — oculta la leyenda de fases; el panel de detalle muestra la fase lunar, no la de ciclo.
    await page.getByTestId("view-mode-moon").click();
    await expect(page.getByTestId("phase-legend")).toHaveCount(0);
    await expect(page.getByTestId("day-detail-moon-block")).toBeVisible();

    // Vuelve a "Ambos" — todo reaparece.
    await page.getByTestId("view-mode-both").click();
    await expect(page.getByTestId("phase-legend")).toBeVisible();
    await expect(page.getByTestId("day-detail-moon-block")).toBeVisible();
  });

  // Regression test for: getPhaseInfo(null) devolvía un fallback pastel/translúcido
  // (rgba(61,43,80,0.15) + gradiente casi blanco) que dejaba el texto blanco del panel de
  // detalle prácticamente invisible en días sin datos de fase. Fix: fallback sólido de la
  // familia de marca (#5C4D73/#6B5C7D/#7A6B92), cada tono con contraste WCAG AA >= 4.5:1
  // contra texto blanco. Este test verifica el color renderizado real (rgb equivalente del
  // computed style), no solo que el panel sea visible.
  test("día sin datos de fase usa el gradiente neutro sólido nuevo, no el fallback pastel viejo", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState("networkidle");

    // weekMetricsBody marca los días de índice 5 y 6 (viernes/sábado) de cada semana devuelta
    // con phaseName: null — buscamos la primera celda visible que caiga en esos días.
    const targetDate = await page.evaluate(() => {
      const cells = Array.from(
        document.querySelectorAll('[data-testid="calendar-day-cell"]'),
      );
      for (const cell of cells) {
        const date = cell.getAttribute("data-date");
        if (!date) continue;
        const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
        if (dayOfWeek === 5 || dayOfWeek === 6) return date;
      }
      return null;
    });
    expect(targetDate).not.toBeNull();

    await page
      .locator(`[data-testid="calendar-day-cell"][data-date="${targetDate}"]`)
      .click();

    const panel = page.getByTestId("day-detail-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Sin datos de fase");

    const backgroundImage = await panel.evaluate(
      (el) => getComputedStyle(el).backgroundImage,
    );
    // rgb equivalentes de #5C4D73, #6B5C7D, #7A6B92 — el navegador normaliza hex a rgb() en
    // el computed style. Confirma que el gradiente sólido nuevo se está aplicando de verdad,
    // no solo que el panel "se ve".
    expect(backgroundImage).toContain("92, 77, 115");
    expect(backgroundImage).toContain("107, 92, 125");
    expect(backgroundImage).toContain("122, 107, 146");
  });

  // Pulido menor pedido junto al fix de contraste: una celda "hoy" sin phaseName debe seguir
  // distinguiéndose de un día cualquiera (antes quedaba completamente plana). El día real de
  // hoy es "hoy" siempre por cálculo local de useCalendar (baseDayForDate), nunca por el
  // `isToday` que devuelve /user-phase/metrics — ese campo está calculado contra el anchor de
  // cada semana pedida, no contra la fecha real, así que useCalendar lo ignora a propósito
  // (ver el merge de phaseByDate). Por default el día de hoy también viene seleccionado, así
  // que hay que seleccionar otro día primero para poder ver el anillo de "hoy" sin que el de
  // "seleccionado" lo tape.
  test("celda de 'hoy' sin phaseName muestra el anillo neutro cuando no está seleccionada", async ({
    page,
  }) => {
    const token = fakeIdToken();
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const realDay = now.getUTCDate();
    const todayDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(realDay).padStart(2, "0")}`;
    const decoyDay = realDay === 1 ? 2 : 1;
    const decoyDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(decoyDay).padStart(2, "0")}`;

    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/period/summary`, (route) =>
      fulfillJson(route, periodSummaryBody()),
    );
    await page.route(`${API_URL}/user-phase/metrics/*`, (route) => {
      const url = new URL(route.request().url());
      const anchor = url.pathname.split("/").pop() ?? todayDate;
      const week = weekMetricsBody(anchor).map((day) =>
        day.date === todayDate ? { ...day, phaseName: null } : day,
      );
      return fulfillJson(route, week);
    });
    await mockMoonPhaseRange(page);

    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState("networkidle");

    // Deselecciona el día de hoy (seleccionado por default) para poder ver su anillo de "hoy"
    // sin que el de "seleccionado" lo tape.
    await page
      .locator(`[data-testid="calendar-day-cell"][data-date="${decoyDate}"]`)
      .click();

    const todayCell = page.locator(
      `[data-testid="calendar-day-cell"][data-date="${todayDate}"]`,
    );
    await expect(todayCell).toBeVisible();
    await expect(todayCell).toHaveAttribute("data-today", "true");

    const boxShadow = await todayCell.evaluate(
      (el) => getComputedStyle(el).boxShadow,
    );
    // rgb equivalente de #6B5C7D (NO_PHASE_INFO.dotColor) — mismo tono neutro que el fallback
    // de phaseInfo.ts, no el color de una fase real.
    expect(boxShadow).toContain("107, 92, 125");
  });

  // Regression test for: useCalendar pide /user-phase/metrics una vez por cada semana
  // visible (un anchor distinto por semana, ver weekAnchorDatesForMonth), y el BE calcula
  // `isToday` de cada día comparándolo contra el anchor de ESA llamada, no contra la fecha
  // real de hoy. Un spread completo de esa respuesta pisaba el `isToday` correcto que ya
  // calculaba useCalendar, marcando como "hoy" el anchor de cada semana (ej. cada domingo
  // del mes) además del día real. Fix: el merge de phaseByDate solo transplanta `phaseName`,
  // nunca `isToday`.
  test("solo el día real de hoy tiene el anillo de 'hoy', no los anchors de cada semana pedida", async ({
    page,
  }) => {
    const token = fakeIdToken();
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const realDay = now.getUTCDate();
    const todayDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(realDay).padStart(2, "0")}`;
    const decoyDay = realDay === 1 ? 2 : 1;
    const decoyDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(decoyDay).padStart(2, "0")}`;

    await mockAuthenticatedShell(page);
    // weekMetricsBody ya marca `isToday: iso === todayDate` contra el anchor recibido — con el
    // bug, cada anchor de semana (no solo el día real) terminaba con isToday:true en su propia
    // respuesta y pisaba el resto.
    await seedAuthToken(page, token);
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState("networkidle");

    // Deselecciona el día de hoy (seleccionado por default) para que su anillo de "hoy" no
    // quede tapado por el de "seleccionado".
    await page
      .locator(`[data-testid="calendar-day-cell"][data-date="${decoyDate}"]`)
      .click();

    const todayCellCount = await page
      .locator('[data-testid="calendar-day-cell"][data-today="true"]')
      .count();
    expect(todayCellCount).toBe(1);
    await expect(
      page.locator(`[data-testid="calendar-day-cell"][data-date="${todayDate}"]`),
    ).toHaveAttribute("data-today", "true");
  });

  // Cubre la migración del cálculo lunar 100% client-side (src/lib/moonPhase.ts, ya eliminado
  // de este flujo) a datos reales fetcheados de GET /moon-phase/range — verifica tanto el
  // shape de la request (rango del mes visible completo, una sola llamada) como que el ícono
  // de la grilla y el bloque de detalle reflejan la respuesta mockeada del endpoint.
  test("ícono de luna en la grilla y panel de detalle usan datos reales de /moon-phase/range", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    const requestedRanges: Array<{ start: string; end: string }> = [];
    await page.route(`${API_URL}/moon-phase/range*`, (route) => {
      const url = new URL(route.request().url());
      const start = url.searchParams.get("start") ?? "";
      const end = url.searchParams.get("end") ?? "";
      requestedRanges.push({ start, end });
      return fulfillJson(route, moonRangeBody(start, end));
    });

    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState("networkidle");

    // React.StrictMode (dev) invoca este efecto dos veces por diseño para una llamada GET
    // idempotente sin guard — mismo patrón, sin guard, que ya usa el resto de fetches de solo
    // lectura de este hook (no es el caso de un intercambio de código OAuth de un solo uso, que
    // sí necesita `useRef`). Lo que importa acá es que cada llamada pide el rango del mes
    // visible completo en un solo request (start=01, no fetchea por semana como
    // /user-phase/metrics) y que todas las llamadas piden exactamente el mismo rango (sin
    // duplicar trabajo por un cambio de `token` ajeno al mes visible).
    expect(requestedRanges.length).toBeGreaterThanOrEqual(1);
    for (const range of requestedRanges) {
      expect(range).toEqual(requestedRanges[0]);
    }
    expect(requestedRanges[0].start).toMatch(/^\d{4}-\d{2}-01$/);
    expect(requestedRanges[0].end).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // moonRangeBody devuelve illumination:100 para todo el rango — supera el umbral "notable"
    // (>=97%) usado por MonthGrid, así que el ícono de luna debe aparecer en la grilla.
    await expect(
      page.getByTestId("calendar-day-moon-icon").first(),
    ).toBeVisible();

    // El panel de detalle del día seleccionado (hoy, por defecto) muestra el dato real.
    const moonBlock = page.getByTestId("day-detail-moon-block");
    await expect(moonBlock).toBeVisible();
    await expect(moonBlock).toContainText("Luna llena · 100%");
  });

  test("si /moon-phase/range falla, se oculta el ícono de luna y el bloque de detalle (sin valor incorrecto)", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/period/summary`, (route) =>
      fulfillJson(route, periodSummaryBody()),
    );
    await page.route(`${API_URL}/user-phase/metrics/*`, (route) => {
      const url = new URL(route.request().url());
      const date = url.pathname.split("/").pop() ?? "2026-07-10";
      return fulfillJson(route, weekMetricsBody(date));
    });
    await page.route(`${API_URL}/moon-phase/range*`, (route) => route.abort());
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState("networkidle");

    // El resto del calendario sigue funcionando (fase de ciclo no depende del dato lunar).
    await expect(page.getByTestId("month-grid")).toBeVisible();
    await expect(page.getByTestId("day-detail-panel")).toBeVisible();
    // Sin dato lunar: ícono y bloque de detalle ocultos, no un valor incorrecto ni un error
    // general del calendario.
    await expect(page.getByTestId("calendar-day-moon-icon")).toHaveCount(0);
    await expect(page.getByTestId("day-detail-moon-block")).toHaveCount(0);
    await expect(page.getByTestId("calendar-error")).toHaveCount(0);
  });
});

test.describe("/calendar — resumen de perfil", () => {
  test("con perfil configurado, muestra los 4 campos del resumen", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);

    const card = page.getByTestId("cycle-summary-card");
    await expect(card).toBeVisible();
    // periodSummaryBody() default tiene activePeriod.isActive: true, así que la fila de "día
    // del ciclo" queda reemplazada por el badge — se verifica en el test siguiente.
    await expect(page.getByTestId("cycle-summary-average-length")).toContainText(
      "28 días",
    );
    await expect(page.getByTestId("cycle-summary-next-period")).toBeVisible();
    await expect(page.getByTestId("cycle-summary-fertile-window")).toBeVisible();
  });

  test("activePeriod.isActive true muestra el badge 'En tu período' en vez de la fila de día de ciclo", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);

    await expect(page.getByTestId("cycle-summary-active-period-badge")).toContainText(
      "En tu período · día 3",
    );
    await expect(page.getByTestId("cycle-summary-day")).toHaveCount(0);
  });

  test("con perfil no configurado, muestra el estado vacío y el CTA navega a /profile", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/period/summary`, (route) =>
      fulfillJson(
        route,
        periodSummaryBody({
          lastPeriod: null,
          cycle: null,
          activePeriod: null,
        }),
      ),
    );
    await page.route(`${API_URL}/user-phase/metrics/*`, (route) => {
      const url = new URL(route.request().url());
      const date = url.pathname.split("/").pop() ?? "2026-07-10";
      return fulfillJson(route, weekMetricsBody(date));
    });
    await mockMoonPhaseRange(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);

    await expect(page.getByTestId("cycle-summary-empty")).toContainText(
      "Todavía no configuraste los datos de tu ciclo",
    );
    await page.getByTestId("cycle-summary-configure-cta").click();
    await expect(page).toHaveURL(`${BASE_URL}/profile`);
  });

  test("usuaria guest (sin token) también ve el estado vacío, no fallbacks por campo", async ({
    page,
  }) => {
    // /calendar no está detrás de ProtectedRoute — un guest puede entrar directo. Sin token,
    // usePeriodSummary nunca llama a getPeriodSummary y `summary` queda en `null` (no en un
    // objeto con los 3 campos en null) — regresión: la card debe tratar esto igual que el
    // "perfil no configurado" de arriba, no caer al branch de datos con "Sin datos"/"días" sueltos.
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/user-phase/metrics/*`, (route) => {
      const url = new URL(route.request().url());
      const date = url.pathname.split("/").pop() ?? "2026-07-10";
      return fulfillJson(route, weekMetricsBody(date));
    });
    // Dato lunar es público — corre también para un guest sin token (no gatea detrás de auth).
    await mockMoonPhaseRange(page);

    await page.goto(`${BASE_URL}/calendar`);

    await expect(page.getByTestId("cycle-summary-empty")).toContainText(
      "Todavía no configuraste los datos de tu ciclo",
    );
    await expect(page.getByTestId("cycle-summary-average-length")).toHaveCount(0);
    await page.getByTestId("cycle-summary-configure-cta").click();
    await expect(page).toHaveURL(`${BASE_URL}/profile`);
  });

  test("error de red en /period/summary muestra el mensaje de error", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillJson(route, []),
    );
    await page.route(`${API_URL}/period/summary`, (route) => route.abort());
    await page.route(`${API_URL}/user-phase/metrics/*`, (route) => {
      const url = new URL(route.request().url());
      const date = url.pathname.split("/").pop() ?? "2026-07-10";
      return fulfillJson(route, weekMetricsBody(date));
    });
    await mockMoonPhaseRange(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/calendar`);

    await expect(page.getByTestId("cycle-summary-card-error")).toBeVisible();
    await expect(page.getByTestId("cycle-summary-retry")).toBeVisible();
  });

  test("viewport 375px — sin overflow horizontal con el resumen de perfil visible", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("cycle-summary-card")).toBeVisible();
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("/chat conserva funcionalidad con el shell nuevo", () => {
  test("smoke test — sidebar nuevo + chat funcional", async ({ page }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/chat`);

    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("nav-item-chat")).toBeVisible();
    await expect(page.getByTestId("empty-state")).toBeVisible();
  });
});

test.describe("/profile", () => {
  test("banner Crear cuenta se muestra en estado guest y navega a /login", async ({
    page,
  }) => {
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillJson(route, CONFIG_BODY),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillJson(route, AGENT_ME_BODY),
    );

    await page.goto(`${BASE_URL}/profile`);

    await expect(page.getByTestId("create-account-banner")).toBeVisible();
    await page.getByTestId("create-account-button").click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test("banner Crear cuenta no se muestra con sesión autenticada", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/profile`);

    await expect(page.getByTestId("create-account-banner")).toHaveCount(0);
  });

  test("guardar última regla + duración dispara un único POST /period/start con el shape correcto", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    let postCount = 0;
    let capturedBody: Record<string, unknown> | null = null;

    await page.route(`${API_URL}/period/start`, async (route) => {
      postCount += 1;
      capturedBody = route.request().postDataJSON();
      await fulfillJson(route, periodSummaryBody({ cycleId: "cycle-2" }));
    });

    await page.goto(`${BASE_URL}/profile`);

    await expect(page.getByTestId("cycle-form")).toBeVisible();
    await page.getByTestId("cycle-length-select").selectOption("30");
    await page.getByTestId("last-period-input").fill("2026-07-05");
    await page.getByTestId("cycle-form-submit").click();

    await expect(page.getByTestId("cycle-form-success")).toBeVisible();
    expect(postCount).toBe(1);
    expect(capturedBody).toMatchObject({
      reportedStartDate: "2026-07-05",
      source: "USER",
      periodLength: expect.any(Number),
      cycleLength: 30,
    });
    expect(typeof (capturedBody as Record<string, unknown>).reportedAt).toBe(
      "string",
    );
  });

  test("botones Descargar mis datos y Borrar todo están deshabilitados y no disparan requests", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    let dataRequestFired = false;
    await page.route(`${API_URL}/**/export*`, (route) => {
      dataRequestFired = true;
      return route.abort();
    });
    await page.route(`${API_URL}/**/delete*`, (route) => {
      dataRequestFired = true;
      return route.abort();
    });

    await page.goto(`${BASE_URL}/profile`);

    const downloadButton = page.getByTestId("download-data-button");
    const deleteButton = page.getByTestId("delete-all-button");
    await expect(downloadButton).toBeDisabled();
    await expect(deleteButton).toBeDisabled();
    await downloadButton.click({ force: true });
    await deleteButton.click({ force: true });
    expect(dataRequestFired).toBe(false);
  });

  test("notificaciones son toggles locales — no disparan requests al cambiar", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    let notificationRequestFired = false;
    await page.route(`${API_URL}/**/notifications*`, (route) => {
      notificationRequestFired = true;
      return route.abort();
    });

    await page.goto(`${BASE_URL}/profile`);

    const toggle = page.getByTestId("toggle-journal-reminder");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(notificationRequestFired).toBe(false);
  });
});

test.describe("/profile/privacy", () => {
  test("botones Próximamente están deshabilitados", async ({ page }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.goto(`${BASE_URL}/profile/privacy`);

    await expect(page.getByTestId("profile-privacy-download-button")).toBeDisabled();
    await expect(page.getByTestId("profile-privacy-delete-button")).toBeDisabled();
  });
});

test.describe("Responsive 768px — DataPrivacyCard no se comprime con el sidebar real", () => {
  // Regression test for: a 768px, el Sidebar fijo (~248px + padding) reduce el ancho real del
  // <main> a ~520-560px. DataPrivacyCard.tsx usaba `md:flex-row` (activa a 768px) con un bloque
  // de botones `shrink-0`/`whitespace-nowrap` que no cedía espacio — el bloque de texto quedaba
  // comprimido a una columna angosta, envolviendo palabra por palabra. Fix: el layout pasa a
  // `lg:flex-row` (1024px) en vez de `md:flex-row`, así que a 768px el texto ocupa el ancho
  // completo del <main> en su propia fila. Este test navega /profile completo (con el Sidebar
  // real montado vía AppShell), no la card en aislamiento — así es como QA reprodujo el bug.
  test("el texto de 'Datos y privacidad' no se envuelve en columnas de una palabra a 768px", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForLoadState("networkidle");

    // El sidebar fijo debe estar presente y visible — si no lo está, la medición de abajo no
    // reproduce el escenario real que QA reportó.
    await expect(page.getByTestId("app-sidebar")).toBeVisible();

    const card = page.getByTestId("data-privacy-card");
    await expect(card).toBeVisible();

    const textBlock = page.getByTestId("data-privacy-description");
    await expect(textBlock).toBeVisible();
    const box = await textBlock.evaluate((el) => ({
      width: (el as HTMLElement).clientWidth,
      height: (el as HTMLElement).clientHeight,
    }));
    // El bloque de texto tiene ~85 caracteres a 14.5px — un ancho por debajo de ~150px solo es
    // posible si está envolviendo casi palabra por palabra (compresión), no por su max-w-[460px]
    // declarado. En el layout arreglado (flex-col a 768px), el bloque ocupa el ancho completo
    // disponible del <main> (varios cientos de px).
    expect(box.width).toBeGreaterThan(150);
    // Con ese ancho, dos líneas de ~14.5px/1.5 line-height alcanzan para el texto completo —
    // una compresión palabra-por-palabra produciría muchas más líneas y una altura desproporcionada.
    expect(box.height).toBeLessThan(100);

    // Sin overflow horizontal a 768px tampoco.
    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("Responsive 768px — CycleCard no comprime el aviso de 'Tu ciclo' con el sidebar real", () => {
  // Regression test for: a 768px, el grid `md:grid-cols-2` de PerfilPage (index.tsx) partía
  // "Tu ciclo" y "Notificaciones" en dos columnas en el mismo breakpoint (`md`) en que el
  // Sidebar fijo (~248px, `hidden md:flex`) y el `md:px-16` del <main> también se activan —
  // igual que el bug ya arreglado en DataPrivacyCard. Eso dejaba la columna de CycleCard en
  // ~184px reales, y el div del aviso verde (sin flex-basis propio, dentro de un flex con el
  // ícono Info) se renderizaba en ~65px, prácticamente su ancho min-content (la palabra más
  // larga) — el texto se envolvía casi palabra por palabra. Fix: el grid de PerfilPage pasa a
  // `lg:grid-cols-2` (1024px) en vez de `md:grid-cols-2`, así que a 768px "Tu ciclo" ocupa el
  // ancho completo del <main> (apilado sobre "Notificaciones"), con espacio de sobra para el
  // aviso. Este test navega /perfil completo (Sidebar real vía AppShell), no CycleCard en
  // aislamiento — así es como QA reprodujo el bug.
  test("el aviso 'Lila usa estos datos...' no se envuelve en columnas de una palabra a 768px", async ({
    page,
  }) => {
    const token = fakeIdToken();
    await mockAuthenticatedShell(page);
    await seedAuthToken(page, token);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/perfil`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("app-sidebar")).toBeVisible();

    const cycleCard = page.getByTestId("cycle-card");
    await expect(cycleCard).toBeVisible();

    const infoBanner = page.getByTestId("cycle-info-banner");
    await expect(infoBanner).toBeVisible();
    const box = await infoBanner.evaluate((el) => ({
      width: (el as HTMLElement).clientWidth,
      height: (el as HTMLElement).clientHeight,
    }));
    // El aviso tiene ~75 caracteres a 13.5px — un ancho por debajo de ~150px solo es posible
    // si está envolviendo casi palabra por palabra (compresión de la columna), no por su
    // layout normal. En el layout arreglado (grid de 1 columna a 768px), el aviso ocupa el
    // ancho completo del <main> (varios cientos de px).
    expect(box.width).toBeGreaterThan(150);
    // Con ese ancho, dos líneas de ~13.5px/relaxed line-height alcanzan para el texto completo
    // — una compresión palabra-por-palabra produciría muchas más líneas y una altura
    // desproporcionada.
    expect(box.height).toBeLessThan(80);

    // Sin overflow horizontal a 768px tampoco.
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe("Responsive 375px — sin overflow horizontal", () => {
  const routes = [
    "/today",
    "/chat",
    "/calendar",
    "/learn",
    "/profile",
    "/profile/privacy",
  ];

  for (const route of routes) {
    test(`${route} no tiene overflow horizontal en 375px`, async ({ page }) => {
      const token = fakeIdToken();
      await mockAuthenticatedShell(page);
      await seedAuthToken(page, token);

      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState("networkidle");

      const hasOverflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(hasOverflow).toBe(false);
    });
  }
});
