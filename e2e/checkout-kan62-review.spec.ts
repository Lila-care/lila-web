import { test, expect, type Page } from "@playwright/test";
import {
  BASE_URL,
  LIST_AMOUNT_IN_CENTS,
  LILA20_AMOUNT_IN_CENTS,
  POST_LOGIN_REDIRECT_KEY,
  PREMIUM_PLAN,
  type QuoteHandler,
  applyCode,
  clickPay,
  completeLoginCallback,
  createGate,
  defaultQuoteHandler,
  emitWidgetResult,
  expectWidgetOpened,
  installWidgetStub,
  mockCheckoutApi,
  openCheckout,
  quoteBody,
  reject,
  respondOk,
  seedSession,
  waitForReady,
  widgetCalls,
} from "./support/checkout-stubs";

// KAN-62 — review + QA follow-ups: locking the code while paying, paying with a refused code,
// promo-vs-code warning, Wompi overlay watchdog, focus/hover styling and the login redirect.

const PROMO_AMOUNT_IN_CENTS = 1490000;
const PROMO_PLAN = { ...PREMIUM_PLAN, promoAmountInCents: PROMO_AMOUNT_IN_CENTS };

const notDeployed: QuoteHandler = () => ({
  status: 404,
  body: { statusCode: 404, message: "Cannot POST" },
});

test.describe("Checkout — pagar con un código rechazado (BUG-001)", () => {
  test("código inválido: Pagar cobra SIN el código, el campo conserva el error y el aviso lo dice", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);
    await applyCode(page, "nope");
    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "invalid",
    );

    await expect(page.getByTestId("pay-without-code-note")).toContainText(
      "Se cobrará $ 19.900 sin código",
    );
    await clickPay(page);
    await expectWidgetOpened(page, 1);

    expect((await widgetCalls(page))[0].params.amountInCents).toBe(
      LIST_AMOUNT_IN_CENTS,
    );
    // The quote for the payment carries no code (the rejected validation was call #1).
    expect(api.quoteBodies).toHaveLength(2);
    expect(api.quoteBodies[1]).toEqual({ planId: PREMIUM_PLAN.planId });
    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "invalid",
    );
    await expect(page.getByLabel("Código de descuento")).toHaveValue("nope");
  });

  test("servicio de códigos caído: el copy invita a pagar sin código y Pagar funciona", async ({
    page,
  }) => {
    const api = await openCheckout(page, { quote: notDeployed });
    await waitForReady(page);
    await applyCode(page, "LILA20");

    const feedback = page.getByTestId("code-feedback");
    await expect(feedback).toHaveAttribute("data-status", "unavailable");
    await expect(feedback).toContainText("pagar sin código");
    await expect(feedback).not.toContainText("continúa");
    await expect(page.getByTestId("pay-without-code-note")).toBeVisible();

    await clickPay(page);
    await expectWidgetOpened(page, 1);
    // Legacy fallback (no code involved): list price, signed by checkout-signature.
    expect((await widgetCalls(page))[0].params.amountInCents).toBe(
      LIST_AMOUNT_IN_CENTS,
    );
    expect(api.signatureQueries).toHaveLength(1);
  });

  test("editar el texto tras un rechazo vuelve a bloquear Pagar (texto nunca aplicado)", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);
    await applyCode(page, "nope");
    await expect(page.getByTestId("pay-without-code-note")).toBeVisible();

    await page.getByLabel("Código de descuento").fill("LILA2");
    await expect(page.getByTestId("pay-without-code-note")).toHaveCount(0);
    await clickPay(page);

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "unsaved",
    );
    expect(await widgetCalls(page)).toHaveLength(0);
    expect(api.quoteBodies).toHaveLength(1);
  });

  test("quote 500 SIN código: NO activa el fallback legado y muestra el error de pago", async ({
    page,
  }) => {
    const api = await openCheckout(page, {
      quote: () => ({ status: 500, body: { statusCode: 500, message: "boom" } }),
    });
    await waitForReady(page);

    await clickPay(page);

    await expect(page.getByTestId("payment-outcome")).toContainText(
      "No pudimos preparar tu pago",
    );
    expect(api.signatureQueries).toHaveLength(0);
    expect(await widgetCalls(page)).toHaveLength(0);
    await expect(page.getByTestId("pay-button")).toBeFocused();
  });
});

test.describe("Checkout — el código queda bloqueado mientras se paga", () => {
  // Second quote onwards is held until the test releases it.
  function holdPaymentQuote() {
    const gate = createGate();
    return { gate, quoteGate: (callCount: number) => (callCount >= 2 ? gate.promise : undefined) };
  }

  test("con un código aplicado: Quitar no hace nada durante 'Abriendo pago...' y el widget abre con el monto mostrado", async ({
    page,
  }) => {
    const { gate, quoteGate } = holdPaymentQuote();
    const api = await openCheckout(page, { quoteGate });
    await waitForReady(page);
    await applyCode(page, "LILA20");
    await expect(page.getByTestId("summary-total")).toContainText("15.920");

    await clickPay(page);
    await expect(page.getByTestId("pay-button")).toHaveText("Abriendo pago...");

    const input = page.getByLabel("Código de descuento");
    const action = page.getByTestId("code-action");
    await expect(input).toHaveAttribute("readonly", "");
    await expect(action).toHaveAttribute("aria-disabled", "true");
    await action.click({ force: true });
    await input.press("Enter");

    // Nothing changed: still applied, same total, no extra quote.
    await expect(action).toHaveText("Quitar");
    await expect(page.getByTestId("summary-total")).toContainText("15.920");
    expect(api.quoteBodies).toHaveLength(2);

    gate.open();
    await expectWidgetOpened(page, 1);
    expect((await widgetCalls(page))[0].params.amountInCents).toBe(
      LILA20_AMOUNT_IN_CENTS,
    );
    // Still locked while Wompi's overlay is open.
    await expect(input).toHaveAttribute("readonly", "");
    await expect(action).toHaveAttribute("aria-disabled", "true");
  });

  test("con un código rechazado en el campo: Aplicar no hace nada durante 'Abriendo pago...'", async ({
    page,
  }) => {
    const { gate, quoteGate } = holdPaymentQuote();
    const api = await openCheckout(page, { quoteGate });
    await waitForReady(page);
    await applyCode(page, "nope");
    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "invalid",
    );

    await clickPay(page);
    await expect(page.getByTestId("pay-button")).toHaveText("Abriendo pago...");
    await expect(page.getByLabel("Código de descuento")).toHaveAttribute(
      "readonly",
      "",
    );
    await page.getByTestId("code-action").click({ force: true });
    await page.getByLabel("Código de descuento").press("Enter");
    expect(api.quoteBodies).toHaveLength(2);

    gate.open();
    await expectWidgetOpened(page, 1);
    expect((await widgetCalls(page))[0].params.amountInCents).toBe(
      LIST_AMOUNT_IN_CENTS,
    );
  });

  test("al terminar el intento (cierre sin pagar) el campo vuelve a ser editable", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);
    await clickPay(page);
    await expectWidgetOpened(page, 1);
    await expect(page.getByLabel("Código de descuento")).toHaveAttribute(
      "readonly",
      "",
    );

    await emitWidgetResult(page, {});

    await expect(page.getByLabel("Código de descuento")).not.toHaveAttribute(
      "readonly",
      "",
    );
    await expect(page.getByTestId("code-action")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

test.describe("Checkout — total obsoleto (override)", () => {
  // The no-code quote says 14.900 (a promo started after the page loaded); from the 3rd quote on
  // LILA20 is refused as expired.
  const staleTotalQuotes: QuoteHandler = (request, callCount) => {
    if (!request.code) {
      return respondOk(quoteBody(callCount, 1490000, 500000, null));
    }
    if (callCount >= 3) return reject("DISCOUNT_EXPIRED");
    return defaultQuoteHandler(request, callCount);
  };

  // Leaves an override for "no code" (14.900) and then a valid LILA20 applied (15.920).
  async function openWithStaleOverrideAndCode(page: Page) {
    await openCheckout(page, { quote: staleTotalQuotes });
    await waitForReady(page);
    await clickPay(page);
    await expect(page.getByTestId("summary-total")).toContainText("14.900");
    await applyCode(page, "LILA20");
    await expect(page.getByTestId("summary-total")).toContainText("15.920");
  }

  test("Quitar muestra el total del plan, no el override obsoleto", async ({
    page,
  }) => {
    await openWithStaleOverrideAndCode(page);

    await page.getByTestId("code-action").click();

    await expect(page.getByTestId("summary-total")).toContainText("19.900");
  });

  test("un código que el quote de Pagar rechaza se descarta sin reactivar el override obsoleto", async ({
    page,
  }) => {
    await openWithStaleOverrideAndCode(page);

    await clickPay(page); // 3rd quote: LILA20 refused as expired -> dropped

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "expired",
    );
    await expect(page.getByTestId("summary-total")).toContainText("19.900");
    expect(await widgetCalls(page)).toHaveLength(0);
  });
});

test.describe("Checkout — código peor que la promo (BUG-004)", () => {
  const codeQuotes: QuoteHandler = ({ code }, callCount) => {
    if (code === "BIG50") return respondOk(quoteBody(callCount, 995000, 995000, code));
    if (code === "LILA20") {
      return respondOk(quoteBody(callCount, LILA20_AMOUNT_IN_CENTS, 398000, code));
    }
    return respondOk(quoteBody(callCount, PROMO_AMOUNT_IN_CENTS, 500000, null));
  };

  test("avisa cuánto paga con el código vs. la promo y permite quitarlo", async ({
    page,
  }) => {
    await openCheckout(page, { plans: [PROMO_PLAN], quote: codeQuotes });
    await waitForReady(page);
    await expect(page.getByTestId("summary-total")).toContainText("14.900");
    await expect(page.getByTestId("promo-override-notice")).toHaveCount(0);

    await applyCode(page, "LILA20");

    const notice = page.getByTestId("promo-override-notice");
    await expect(notice).toContainText("Con este código pagas $ 15.920");
    await expect(notice).toContainText("sin él la promo te deja en $ 14.900");
    await expect(page.getByTestId("status-region")).toContainText(
      "Sin el código la promoción te deja en $ 14.900",
    );

    await page.getByTestId("promo-override-remove").click();
    await expect(notice).toHaveCount(0);
    await expect(page.getByTestId("summary-total")).toContainText("14.900");
    await expect(page.getByTestId("code-action")).toHaveText("Aplicar");
  });

  test("un código mejor que la promo no muestra el aviso", async ({ page }) => {
    await openCheckout(page, { plans: [PROMO_PLAN], quote: codeQuotes });
    await waitForReady(page);

    await applyCode(page, "BIG50");

    await expect(page.getByTestId("summary-total")).toContainText("9.950");
    await expect(page.getByTestId("promo-override-notice")).toHaveCount(0);
  });
});

test.describe("Checkout — overlay de Wompi que desaparece sin callback (watchdog)", () => {
  interface WatchdogTestWindow {
    __listeners: { focus: number; visibilitychange: number };
    // Every callback the stub widget was opened with, oldest first.
    __widgetCallbacks: Array<(result: unknown) => void>;
  }
  type ListenerCounts = WatchdogTestWindow;

  // WidgetCheckout stub that injects an overlay <iframe> like the real widget and NEVER calls
  // back. Also counts net window `focus` / document `visibilitychange` listeners.
  async function openWithSilentWidget(page: Page) {
    await seedSession(page);
    await installWidgetStub(page);
    await page.addInitScript(() => {
      const counts = { focus: 0, visibilitychange: 0 };
      (window as unknown as ListenerCounts).__listeners = counts;
      const track = (type: string, delta: number) => {
        if (type === "focus") counts.focus += delta;
        if (type === "visibilitychange") counts.visibilitychange += delta;
      };
      const add = EventTarget.prototype.addEventListener;
      const remove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (type: string, ...rest: never[]) {
        if (this === window || this === document) track(type, 1);
        return (add as (...args: unknown[]) => void).call(this, type, ...rest);
      } as typeof add;
      EventTarget.prototype.removeEventListener = function (type: string, ...rest: never[]) {
        if (this === window || this === document) track(type, -1);
        return (remove as (...args: unknown[]) => void).call(this, type, ...rest);
      } as typeof remove;
      const callbacks: Array<(result: unknown) => void> = [];
      (window as unknown as WatchdogTestWindow).__widgetCallbacks = callbacks;
      (window as unknown as { WidgetCheckout: unknown }).WidgetCheckout = class {
        open(onResult: (result: unknown) => void) {
          callbacks.push(onResult);
          const overlay = document.createElement("iframe");
          overlay.id = "wompi-overlay-stub";
          // Served from a Wompi origin, like the real widget (the watchdog ignores other iframes).
          overlay.src = "https://checkout.wompi.co/stub-overlay";
          document.body.appendChild(overlay);
        }
      };
    });
    const api = await mockCheckoutApi(page);
    await page.goto(`${BASE_URL}/checkout`);
    await waitForReady(page);
    return api;
  }

  const listenerCounts = (page: Page) =>
    page.evaluate(() => (window as unknown as ListenerCounts).__listeners);
  const removeOverlay = (page: Page) =>
    page.evaluate(() => document.getElementById("wompi-overlay-stub")?.remove());
  const regainFocus = (page: Page) =>
    page.evaluate(() => window.dispatchEvent(new Event("focus")));

  test("al recuperar el foco sin overlay, desbloquea Pagar con el aviso de cierre y se puede reintentar", async ({
    page,
  }) => {
    const api = await openWithSilentWidget(page);
    const before = await listenerCounts(page);

    await clickPay(page);
    await expect(page.locator("#wompi-overlay-stub")).toBeAttached();
    await expect(page.getByTestId("pay-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    // Overlay still there: regaining focus must NOT unlock.
    await regainFocus(page);
    await expect(page.getByTestId("pay-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await removeOverlay(page);
    await regainFocus(page);

    await expect(page.getByTestId("payment-outcome")).toContainText(
      "No completaste el pago",
    );
    await expect(page.getByTestId("pay-button")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByTestId("pay-button")).toBeFocused();
    await expect(page.getByLabel("Código de descuento")).not.toHaveAttribute(
      "readonly",
      "",
    );
    // Listeners are removed once the widget is no longer open.
    expect(await listenerCounts(page)).toEqual(before);

    await clickPay(page);
    await expect(page.locator("#wompi-overlay-stub")).toBeAttached();
    expect(api.quoteBodies).toHaveLength(2);
  });

  test("también con visibilitychange", async ({ page }) => {
    await openWithSilentWidget(page);
    await clickPay(page);
    await expect(page.locator("#wompi-overlay-stub")).toBeAttached();

    await removeOverlay(page);
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );

    await expect(page.getByTestId("payment-outcome")).toContainText(
      "No completaste el pago",
    );
  });

  test("un iframe ajeno insertado y removido durante widget_open NO desbloquea Pagar", async ({
    page,
  }) => {
    await openCheckout(page); // default stub: opens without injecting any overlay
    await waitForReady(page);
    await clickPay(page);
    await expectWidgetOpened(page, 1);

    await page.evaluate(() => {
      // Neither an about:blank frame nor a third-party one is Wompi's overlay.
      for (const src of ["about:blank", "https://ads.example.test/frame"]) {
        const foreign = document.createElement("iframe");
        foreign.className = "foreign-frame";
        foreign.src = src;
        document.body.appendChild(foreign);
      }
    });
    await expect(page.locator("iframe.foreign-frame")).toHaveCount(2);
    await page.evaluate(() =>
      document.querySelectorAll("iframe.foreign-frame").forEach((frame) => frame.remove()),
    );
    await regainFocus(page);

    await expect(page.getByTestId("pay-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByTestId("payment-outcome")).toBeEmpty();
  });

  async function unlockFirstAttemptThenOpenSecond(page: Page) {
    await clickPay(page);
    await expect(page.locator("#wompi-overlay-stub")).toBeAttached();
    await removeOverlay(page);
    await regainFocus(page);
    await expect(page.getByTestId("payment-outcome")).toContainText(
      "No completaste el pago",
    );

    await clickPay(page); // 2nd attempt, still in progress
    await expect(page.locator("#wompi-overlay-stub")).toBeAttached();
    await expect(page.getByTestId("pay-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }

  const answerFirstWidgetLate = (page: Page, result: unknown) =>
    page.evaluate(
      (payload) =>
        (window as unknown as WatchdogTestWindow).__widgetCallbacks[0](payload),
      result,
    );

  test("un callback tardío del intento desbloqueado por el watchdog no desbloquea el segundo intento", async ({
    page,
  }) => {
    await openWithSilentWidget(page);
    await unlockFirstAttemptThenOpenSecond(page);

    await answerFirstWidgetLate(page, {}); // late "closed" of attempt #1
    await answerFirstWidgetLate(page, {
      transaction: { id: "tx-old", status: "DECLINED" },
    });

    await expect(page.getByTestId("pay-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByLabel("Código de descuento")).toHaveAttribute(
      "readonly",
      "",
    );
    await expect(page.getByTestId("payment-outcome")).toBeEmpty();
  });

  test("un APPROVED tardío de un intento viejo SÍ se confirma (ya se cobró)", async ({
    page,
  }) => {
    const api = await openWithSilentWidget(page);
    await unlockFirstAttemptThenOpenSecond(page);

    await answerFirstWidgetLate(page, {
      transaction: { id: "tx-late", status: "APPROVED" },
    });

    await expect(page.getByTestId("payment-result-approved")).toBeVisible();
    expect(api.confirmBodies).toEqual([
      { transactionId: "tx-late", planId: PREMIUM_PLAN.planId },
    ]);
  });

  test("si nunca apareció un overlay, recuperar el foco no desbloquea (sin falsos positivos)", async ({
    page,
  }) => {
    await openCheckout(page); // default stub: opens without injecting anything
    await waitForReady(page);
    await clickPay(page);
    await expectWidgetOpened(page, 1);

    await regainFocus(page);

    await expect(page.getByTestId("pay-button")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByTestId("payment-outcome")).toBeEmpty();
  });
});

test.describe("Checkout — foco y hover de los botones (BUG-005 / BUG-006)", () => {
  const focusStyle = (page: Page, testId: string) =>
    page.getByTestId(testId).evaluate((element) => {
      const style = getComputedStyle(element);
      return { outline: style.outlineStyle, ring: style.boxShadow };
    });

  test("Aplicar, Quitar y Pagar muestran solo el anillo de marca (sin el outline del navegador)", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);

    await page.getByLabel("Código de descuento").fill("LILA20");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("code-action")).toBeFocused();
    const apply = await focusStyle(page, "code-action");
    expect(apply.outline).toBe("none");
    expect(apply.ring).not.toBe("none");

    // Applying with the keyboard leaves the focus on the same button, now "Quitar".
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("code-action")).toHaveText("Quitar");
    await expect(page.getByTestId("code-action")).toBeFocused();
    const remove = await focusStyle(page, "code-action");
    expect(remove.outline).toBe("none");
    expect(remove.ring).not.toBe("none");

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("pay-button")).toBeFocused();
    const pay = await focusStyle(page, "pay-button");
    expect(pay.outline).toBe("none");
    expect(pay.ring).not.toBe("none");
  });

  test("hover de Quitar usa los tokens de la familia Chat (no el ámbar del DS)", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);
    await applyCode(page, "LILA20");
    const remove = page.getByTestId("code-action");
    await expect(remove).toHaveText("Quitar");

    await remove.hover();

    const hovered = await remove.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    });
    expect(hovered.color).toBe("rgb(126, 53, 101)"); // --brand-primary
    expect(hovered.background).toBe("rgb(243, 237, 248)"); // --surface-muted
  });
});

test.describe("Checkout — destino post-login solo para el login público (BUG-002)", () => {
  const readRedirect = (page: Page) =>
    page.evaluate(
      (key) => sessionStorage.getItem(key),
      POST_LOGIN_REDIRECT_KEY,
    );

  test("un login de admin nunca aterriza en /checkout y consume el destino guardado", async ({
    page,
  }) => {
    await installWidgetStub(page);
    await mockCheckoutApi(page);
    await completeLoginCallback(page, "/checkout?planId=plan-premium", "/admin");

    await page.waitForURL(`${BASE_URL}/chat`);
    expect(await readRedirect(page)).toBeNull();
  });

  test("el login público sí vuelve a /checkout y consume el destino", async ({
    page,
  }) => {
    await installWidgetStub(page);
    await mockCheckoutApi(page);
    await completeLoginCallback(page, "/checkout?planId=plan-premium", "/login");

    await page.waitForURL(`${BASE_URL}/checkout?planId=plan-premium`);
    expect(await readRedirect(page)).toBeNull();
  });
});
