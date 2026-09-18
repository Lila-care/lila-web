import { test, expect } from "@playwright/test";
import {
  BASE_URL,
  API_URL,
  LIST_AMOUNT_IN_CENTS,
  LILA20_AMOUNT_IN_CENTS,
  POST_LOGIN_REDIRECT_KEY,
  PREMIUM_PLAN,
  FREE_PLAN,
  type QuoteHandler,
  respondOk,
  quoteBody,
  fulfillJson,
  mockCheckoutApi,
  installWidgetStub,
  widgetCalls,
  emitWidgetResult,
  seedSession,
  openCheckout,
  waitForReady,
  applyCode,
  clickPay,
  completeLoginCallback,
  expectWidgetOpened,
} from "./support/checkout-stubs";

// KAN-62 — /checkout: plan summary + discount code + Wompi payment (helpers and API/Wompi stubs
// live in ./support/checkout-stubs.ts).

test.describe("Checkout — sin código y con código", () => {
  test("sin código: el plan carga, el total es el precio y Pagar abre el widget con el monto original", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Finaliza tu compra",
    );
    await expect(page.getByText("Premium Mensual")).toBeVisible();
    await expect(page.getByTestId("plan-price")).toContainText("19.900");
    await expect(page.getByTestId("summary-total")).toContainText("19.900");
    await expect(page.getByTestId("discount-row")).toHaveCount(0);
    await expect(page.getByTestId("pay-button")).toHaveText(/Pagar.*19\.900/);

    await clickPay(page);
    await expectWidgetOpened(page, 1);

    const [call] = await widgetCalls(page);
    expect(call.params).toMatchObject({
      currency: "COP",
      amountInCents: LIST_AMOUNT_IN_CENTS,
      reference: "ref-1",
      signature: { integrity: "sig-1" },
    });
    expect(call.params.publicKey).toBeTruthy();
    expect(api.quoteBodies).toEqual([{ planId: "plan-premium" }]);
    expect(api.signatureQueries).toHaveLength(0);
  });

  test("código válido: el resumen y Pagar reflejan el descuento y el widget recibe el monto descontado", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);

    await applyCode(page, "lila20");

    const feedback = page.getByTestId("code-feedback");
    await expect(feedback).toHaveAttribute("data-status", "valid");
    await expect(feedback).toContainText("LILA20");
    await expect(page.getByTestId("discount-row")).toContainText("3.980");
    await expect(page.getByTestId("summary-total")).toContainText("15.920");
    await expect(page.getByTestId("payment-total")).toContainText("15.920");
    await expect(page.getByTestId("pay-button")).toHaveText(/Pagar.*15\.920/);
    await expect(page.getByTestId("code-action")).toHaveText("Quitar");
    await expect(page.getByTestId("code-action")).toBeFocused();

    // The code was normalized (trim + uppercase) before being sent.
    expect(api.quoteBodies[0]).toEqual({
      planId: "plan-premium",
      code: "LILA20",
    });

    await clickPay(page);
    await expectWidgetOpened(page, 1);

    const [call] = await widgetCalls(page);
    expect(call.params.amountInCents).toBe(LILA20_AMOUNT_IN_CENTS);
    // "Pagar" asked for a FRESH quote (ref-2), it did not reuse the one from "Aplicar" (ref-1).
    expect(call.params.reference).toBe("ref-2");
    expect(call.params.signature.integrity).toBe("sig-2");
    expect(api.quoteBodies).toHaveLength(2);
    expect(api.quoteBodies[1]).toEqual({
      planId: "plan-premium",
      code: "LILA20",
    });
  });

  test("código inválido: error visible, total y Pagar intactos, y el widget sigue funcional", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);

    await applyCode(page, "nope");

    const input = page.getByLabel("Código de descuento");
    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "invalid",
    );
    await expect(page.getByTestId("code-feedback")).toContainText(
      "no es válido",
    );
    await expect(page.getByTestId("code-feedback-icon-invalid")).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toBeFocused();
    await expect(page.getByTestId("summary-total")).toContainText("19.900");
    await expect(page.getByTestId("pay-button")).toHaveText(/Pagar.*19\.900/);
    await expect(page.getByTestId("pay-button")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    // Editing clears the stale error, and the purchase without a code still works.
    await input.fill("");
    await expect(page.getByTestId("code-feedback")).toHaveCount(0);
    await clickPay(page);
    await expectWidgetOpened(page, 1);
    expect((await widgetCalls(page))[0].params.amountInCents).toBe(
      LIST_AMOUNT_IN_CENTS,
    );
  });

  test("código expirado: copy e ícono distintos al inválido", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);

    await applyCode(page, "expired1");

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "expired",
    );
    await expect(page.getByTestId("code-feedback")).toContainText("expiró");
    await expect(page.getByTestId("code-feedback")).not.toContainText(
      "no es válido",
    );
    await expect(page.getByTestId("code-feedback-icon-expired")).toBeVisible();
    await expect(page.getByTestId("code-feedback-icon-invalid")).toHaveCount(0);
    await expect(page.getByTestId("summary-total")).toContainText("19.900");
  });

  test("código que deja el total bajo el mínimo: mensaje específico y sin cambiar el monto", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);

    await applyCode(page, "tiny");

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "below_minimum",
    );
    await expect(page.getByTestId("code-feedback")).toContainText(
      "por debajo del mínimo de pago",
    );
    await expect(page.getByTestId("summary-total")).toContainText("19.900");
  });

  test("quitar el código restaura el monto original", async ({ page }) => {
    await openCheckout(page);
    await waitForReady(page);

    await applyCode(page, "LILA20");
    await expect(page.getByTestId("summary-total")).toContainText("15.920");

    await page.getByTestId("code-action").click();

    await expect(page.getByTestId("summary-total")).toContainText("19.900");
    await expect(page.getByTestId("discount-row")).toHaveCount(0);
    await expect(page.getByTestId("code-action")).toHaveText("Aplicar");
    await expect(page.getByLabel("Código de descuento")).toHaveValue("");
    await expect(page.getByLabel("Código de descuento")).toBeFocused();
    await expect(page.getByTestId("pay-button")).toHaveText(/Pagar.*19\.900/);
  });

  test("texto escrito sin aplicar + Pagar: no abre el widget y el foco va al input", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);

    await page.getByLabel("Código de descuento").fill("LILA20");
    await clickPay(page);

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "unsaved",
    );
    await expect(page.getByTestId("code-feedback")).toContainText(
      "Aplica tu código o bórralo antes de pagar",
    );
    await expect(page.getByLabel("Código de descuento")).toBeFocused();
    expect(await widgetCalls(page)).toHaveLength(0);
    expect(api.quoteBodies).toHaveLength(0);
  });
});

test.describe("Checkout — checkout-quote no desplegado (404)", () => {
  const notDeployed: QuoteHandler = () => ({
    status: 404,
    body: { statusCode: 404, message: "Cannot POST" },
  });

  test("con código: muestra 'servicio no disponible' y no bloquea Pagar", async ({
    page,
  }) => {
    await openCheckout(page, { quote: notDeployed });
    await waitForReady(page);

    await applyCode(page, "LILA20");

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "unavailable",
    );
    await expect(page.getByTestId("code-feedback")).toContainText(
      "No pudimos validar tu código ahora",
    );
    await expect(page.getByTestId("summary-total")).toContainText("19.900");
    await expect(page.getByTestId("pay-button")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("sin código: usa el flujo legado (checkout-signature) y se puede pagar", async ({
    page,
  }) => {
    const api = await openCheckout(page, { quote: notDeployed });
    await waitForReady(page);

    await clickPay(page);
    await expectWidgetOpened(page, 1);

    const [call] = await widgetCalls(page);
    expect(call.params.amountInCents).toBe(LIST_AMOUNT_IN_CENTS);
    expect(call.params.reference).toMatch(/^sub-widget-test-user-\d+$/);
    expect(call.params.signature.integrity).toBe("legacy-sig");
    expect(api.signatureQueries).toHaveLength(1);
    expect(api.signatureQueries[0].get("reference")).toBe(
      call.params.reference,
    );
    expect(api.signatureQueries[0].get("amountInCents")).toBe(
      String(LIST_AMOUNT_IN_CENTS),
    );
  });
});

test.describe("Checkout — resultado de Wompi", () => {
  test("APPROVED: confirma solo {transactionId, planId} y muestra la pantalla de éxito", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);
    await applyCode(page, "LILA20");

    await clickPay(page);
    await expectWidgetOpened(page, 1);
    await emitWidgetResult(page, {
      transaction: { id: "tx-123", status: "APPROVED" },
    });

    await expect(page.getByTestId("payment-result-approved")).toBeVisible();
    // No discountCode (or anything else) is sent: the BE runs forbidNonWhitelisted.
    expect(api.confirmBodies).toEqual([
      { transactionId: "tx-123", planId: "plan-premium" },
    ]);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("¡Listo! Ya tienes Premium Mensual");
    await expect(heading).toBeFocused();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText("tx-123")).toBeVisible();
    await expect(page.getByText("15.920")).toBeVisible();
    await expect(page.getByText("LILA20")).toBeVisible();
    await expect(page.getByTestId("status-region")).toContainText(
      "Pago aprobado",
    );
    await expect(page.getByRole("link", { name: "Ir al chat" })).toBeVisible();
  });

  test("APPROVED con 409 (ya activa) también es éxito", async ({ page }) => {
    await openCheckout(page, { confirmStatus: 409 });
    await waitForReady(page);

    await clickPay(page);
    await expectWidgetOpened(page, 1);
    await emitWidgetResult(page, {
      transaction: { id: "tx-409", status: "APPROVED" },
    });

    await expect(page.getByTestId("payment-result-approved")).toBeVisible();
  });

  test("APPROVED pero la confirmación falla: ofrece reintentar y luego confirma", async ({
    page,
  }) => {
    const api = await openCheckout(page, { confirmStatus: 500 });
    await waitForReady(page);

    await clickPay(page);
    await expectWidgetOpened(page, 1);
    await emitWidgetResult(page, {
      transaction: { id: "tx-500", status: "APPROVED" },
    });

    await expect(
      page.getByTestId("payment-result-confirm_failed"),
    ).toBeVisible();
    await expect(page.getByText("tx-500")).toBeVisible();

    api.options.confirmStatus = 201;
    await page.getByRole("button", { name: "Reintentar confirmación" }).click();

    await expect(page.getByTestId("payment-result-approved")).toBeVisible();
    expect(api.confirmBodies).toHaveLength(2);
    // Retrying never opens the widget (and never charges) again.
    expect(await widgetCalls(page)).toHaveLength(1);
  });

  test("PENDING: pantalla 'confirmando' sin botón de pago", async ({
    page,
  }) => {
    const api = await openCheckout(page);
    await waitForReady(page);

    await clickPay(page);
    await expectWidgetOpened(page, 1);
    await emitWidgetResult(page, {
      transaction: { id: "tx-pending", status: "PENDING" },
    });

    await expect(page.getByTestId("payment-result-pending")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Estamos confirmando tu pago",
    );
    // Doesn't promise a notification nobody guarantees.
    await expect(page.getByTestId("payment-result-pending")).toContainText(
      "Tu plan se activará cuando se confirme el pago.",
    );
    await expect(page.getByTestId("payment-result-pending")).not.toContainText(
      "Te avisaremos",
    );
    await expect(page.getByTestId("pay-button")).toHaveCount(0);
    expect(api.confirmBodies).toHaveLength(0);
  });

  test("DECLINED: banner en el panel, foco en Pagar y se conservan código y monto; cerrar sin pagar muestra un aviso liviano", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);
    await applyCode(page, "LILA20");

    await clickPay(page);
    await expectWidgetOpened(page, 1);
    await emitWidgetResult(page, {
      transaction: { id: "tx-declined", status: "DECLINED" },
    });

    await expect(page.getByTestId("payment-outcome")).toContainText(
      "El pago no se completó",
    );
    await expect(page.getByTestId("pay-button")).toBeFocused();
    await expect(page.getByTestId("code-action")).toHaveText("Quitar");
    await expect(page.getByTestId("summary-total")).toContainText("15.920");
    await expect(page.getByTestId("pay-button")).toHaveText(/Pagar.*15\.920/);

    // A retry, then the user closes the overlay without paying (no transaction in the result).
    await clickPay(page);
    await expectWidgetOpened(page, 2);
    await emitWidgetResult(page, {});

    await expect(page.getByTestId("payment-outcome")).toContainText(
      "No completaste el pago",
    );
    await expect(page.getByTestId("payment-outcome")).not.toContainText(
      "El pago no se completó",
    );
    await expect(page.getByTestId("pay-button")).toBeFocused();
  });

  test("si el quote fresco de Pagar difiere del total mostrado, actualiza el total y NO abre el widget", async ({
    page,
  }) => {
    // First quote (no code) is at the list price... but by the time she pays, a promo started.
    const promoStarted: QuoteHandler = (_request, callCount) =>
      respondOk(quoteBody(callCount, 1490000, 500000, null));
    await openCheckout(page, { quote: promoStarted });
    await waitForReady(page);

    await clickPay(page);

    await expect(page.getByTestId("summary-total")).toContainText("14.900");
    await expect(page.getByTestId("pay-button")).toHaveText(/Pagar.*14\.900/);
    await expect(page.getByTestId("payment-outcome")).toContainText(
      "El total cambió",
    );
    await expect(page.getByTestId("status-region")).toContainText(
      "El total se actualizó a",
    );
    expect(await widgetCalls(page)).toHaveLength(0);

    // Now the displayed total matches the quote, so the next attempt opens the widget.
    await clickPay(page);
    await expectWidgetOpened(page, 1);
    expect((await widgetCalls(page))[0].params.amountInCents).toBe(1490000);
  });

  test("el script de Wompi no carga: banner y botón Reintentar", async ({
    page,
  }) => {
    await seedSession(page);
    await mockCheckoutApi(page);
    // Registered after the helper's catch-all, so it takes precedence: first the script fails...
    await page.route("https://checkout.wompi.co/**", (route) => route.abort());
    await page.goto(`${BASE_URL}/checkout`);
    await waitForReady(page);

    await expect(page.getByTestId("payment-outcome")).toContainText(
      "No pudimos abrir el formulario de pago",
    );
    const payButton = page.getByTestId("pay-button");
    await expect(payButton).toHaveText("Reintentar");
    // The code field and summary are untouched.
    await expect(page.getByTestId("summary-total")).toContainText("19.900");

    // ...then it recovers (the script now defines a WidgetCheckout).
    await page.unroute("https://checkout.wompi.co/**");
    await page.route("https://checkout.wompi.co/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: "window.WidgetCheckout = class { open() {} };",
      }),
    );
    await payButton.click();

    await expect(payButton).toHaveText(/Pagar.*19\.900/);
    await expect(page.getByTestId("payment-outcome")).toBeEmpty();
  });
});

test.describe("Checkout — estados de pantalla", () => {
  test("loading: muestra el skeleton mientras carga el plan", async ({
    page,
  }) => {
    let releasePlans: () => void = () => {};
    const plansGate = new Promise<void>((resolve) => {
      releasePlans = resolve;
    });
    await openCheckout(page, { plansGate });

    await expect(page.getByTestId("checkout-skeleton")).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("aria-busy", "true");
    await expect(page.getByTestId("status-region")).toHaveText(
      "Cargando tu plan",
    );
    await expect(page.getByTestId("pay-button")).toHaveCount(0);

    releasePlans();
    await waitForReady(page);
    await expect(page.getByTestId("checkout-skeleton")).toHaveCount(0);
  });

  test("error: si el plan no carga, muestra el error y Reintentar recupera", async ({
    page,
  }) => {
    const api = await openCheckout(page, { plansStatus: 500 });

    await expect(page.getByTestId("plan-error")).toBeVisible();
    await expect(page.getByTestId("plan-error")).toBeFocused();
    await expect(page.getByText("No pudimos cargar tu plan")).toBeVisible();
    await expect(page.getByTestId("pay-button")).toHaveCount(0);

    api.options.plansStatus = 200;
    await page.getByRole("button", { name: "Reintentar" }).click();

    await waitForReady(page);
    await expect(page.getByTestId("plan-error")).toHaveCount(0);
  });

  test("empty: sin planes de pago muestra 'No encontramos este plan'", async ({
    page,
  }) => {
    await openCheckout(page, { plans: [FREE_PLAN] });

    await expect(page.getByTestId("plan-empty")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No encontramos este plan" }),
    ).toBeVisible();
    await expect(page.getByTestId("pay-button")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Volver al chat" }).last(),
    ).toBeVisible();
  });

  test("empty: con varios planes de pago y sin ?planId= no adivina cuál; con ?planId= sí", async ({
    page,
  }) => {
    const otherPlan = { ...PREMIUM_PLAN, planId: "plan-annual", name: "Anual" };
    await openCheckout(page, { plans: [PREMIUM_PLAN, otherPlan] });
    await expect(page.getByTestId("plan-empty")).toBeVisible();

    await page.goto(`${BASE_URL}/checkout?planId=plan-annual`);
    await waitForReady(page);
    await expect(page.getByText("Anual")).toBeVisible();
  });
});

test.describe("Checkout — sesión y entrada", () => {
  test("una invitada en /checkout es enviada al login y su destino se recuerda", async ({
    page,
  }) => {
    await installWidgetStub(page);
    await mockCheckoutApi(page);
    await page.goto(`${BASE_URL}/checkout?planId=plan-premium`);

    await page.waitForURL(`${BASE_URL}/login`);
    await expect(
      page.getByRole("button", { name: /Continuar con Google/ }),
    ).toBeVisible();
    const stored = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      POST_LOGIN_REDIRECT_KEY,
    );
    expect(stored).toBe("/checkout?planId=plan-premium");
  });

  test("AuthCallback devuelve a /checkout tras el login", async ({ page }) => {
    await installWidgetStub(page);
    await mockCheckoutApi(page);
    await completeLoginCallback(page, "/checkout?planId=plan-premium");

    await page.waitForURL(`${BASE_URL}/checkout?planId=plan-premium`);
    await waitForReady(page);
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        POST_LOGIN_REDIRECT_KEY,
      ),
    ).toBeNull();
  });

  test("AuthCallback ignora un destino guardado que no está permitido", async ({
    page,
  }) => {
    await completeLoginCallback(page, "//evil.example/checkout");

    await page.waitForURL(`${BASE_URL}/chat`);
  });

  test("el CTA 'Mejorar mi plan' del modal de límite lleva a /checkout", async ({
    page,
  }) => {
    await seedSession(page);
    await installWidgetStub(page);
    await mockCheckoutApi(page);
    const fulfillOk = (route: Route, body: unknown) =>
      fulfillJson(route, respondOk(body));
    await page.route(`${API_URL}/lila/config`, (route) =>
      fulfillOk(route, { freeQuestionLimit: 3, upgradePromptLimit: 1 }),
    );
    await page.route(`${API_URL}/lila/agent/me`, (route) =>
      fulfillOk(route, {
        userId: "test-user",
        templateVersion: 1,
        isGuest: false,
        hasActiveTemplate: true,
        freeQuestionLimit: 3,
        onboarding: { pending: false, greetingMessage: "¡Hola!" },
      }),
    );
    await page.route(`${API_URL}/lila/conversations`, (route) =>
      fulfillOk(route, []),
    );
    await page.route(`${API_URL}/lila/chat`, (route) =>
      fulfillOk(route, {
        reply: "Claro que sí.",
        conversationId: "conv-1",
        tokensUsed: 5,
      }),
    );
    await page.goto(`${BASE_URL}/chat`);

    const composer = page.getByPlaceholder("Escríbeme...");
    await composer.fill("Hola");
    await composer.press("Enter");

    await page.getByRole("button", { name: "Mejorar mi plan" }).click();

    await page.waitForURL(`${BASE_URL}/checkout`);
    await waitForReady(page);
    await expect(
      page.getByText("Has llegado a tu límite por ahora"),
    ).toHaveCount(0);
  });
});

test.describe("Checkout — responsive y teclado", () => {
  for (const width of [320, 375]) {
    test(`${width}px: una columna y sin overflow horizontal`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await openCheckout(page);
      await waitForReady(page);
      // Worst case for width: the longest feedback message under the input.
      await applyCode(page, "nope");
      await expect(page.getByTestId("code-feedback")).toBeVisible();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const summary = await page.getByTestId("plan-summary").boundingBox();
      const payment = await page.getByTestId("payment-panel").boundingBox();
      expect(summary).not.toBeNull();
      expect(payment).not.toBeNull();
      // Payment panel sits BELOW the summary, full width.
      expect(payment!.y).toBeGreaterThanOrEqual(summary!.y + summary!.height);
      expect(payment!.x).toBeCloseTo(summary!.x, 0);
    });
  }

  test("1440px: dos columnas, resumen a la izquierda y pago a la derecha", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCheckout(page);
    await waitForReady(page);

    const summary = await page.getByTestId("plan-summary").boundingBox();
    const payment = await page.getByTestId("payment-panel").boundingBox();
    expect(summary).not.toBeNull();
    expect(payment).not.toBeNull();
    expect(payment!.x).toBeGreaterThanOrEqual(summary!.x + summary!.width);
    expect(Math.abs(payment!.y - summary!.y)).toBeLessThanOrEqual(2);
  });

  test("Enter dentro del input aplica el código", async ({ page }) => {
    const api = await openCheckout(page);
    await waitForReady(page);

    const input = page.getByLabel("Código de descuento");
    await input.fill("lila20");
    await input.press("Enter");

    await expect(page.getByTestId("code-feedback")).toHaveAttribute(
      "data-status",
      "valid",
    );
    await expect(page.getByTestId("summary-total")).toContainText("15.920");
    // Enter must not be handled twice (explicit handler + implicit form submission).
    expect(api.quoteBodies).toHaveLength(1);
  });

  test("Tab recorre VolverAlChat, input, Aplicar y Pagar en ese orden", async ({
    page,
  }) => {
    await openCheckout(page);
    await waitForReady(page);

    await page.getByRole("link", { name: "Volver al chat" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Código de descuento")).toBeFocused();

    await page.getByLabel("Código de descuento").fill("LILA20");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("code-action")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("pay-button")).toBeFocused();
  });
});
