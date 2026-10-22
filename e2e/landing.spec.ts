import { test, expect } from "@playwright/test";

test.describe("Landing page at /", () => {
  test("renders the landing instead of redirecting to /hoy", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Tu ciclo tiene mucho que contarte" }),
    ).toBeVisible();
  });

  test("availability copy mentions Android and iOS, never iOS alone", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Disponible para Android y iOS")).toBeVisible();
    await expect(page.getByText("Disponible para iOS", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Disponible para iPhone", { exact: false })).toHaveCount(0);
  });

  test("shows every key section", async ({ page }) => {
    await page.goto("/");
    for (const name of [
      "Todo lo de tu ciclo, en un solo lugar",
      "Tus datos son tuyos",
      "Lo básico siempre es gratis",
      "Sigue a Lila",
    ]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("© 2026 Lila Care");
  });

  test("CTAs lead to existing routes and make no API calls", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (/localhost:6100|\/admin\//.test(req.url())) apiCalls.push(req.url());
    });
    await page.goto("/");
    await page.getByRole("link", { name: "Quiero probar Lila" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    expect(apiCalls).toEqual([]);
  });

  test("existing routes still resolve", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms$/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("has no horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByText("Disponible para Android y iOS")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });

  test("has no horizontal scroll at 768px and 1440px", async ({ page }) => {
    for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });
});
