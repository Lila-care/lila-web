import { test, expect } from "@playwright/test";
import { STORE_LINKS } from "../src/Landing/storeLinks";

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

  test("CTAs scroll to #descargar without leaving / or calling the API", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (req) => {
      if (/localhost:6100|\/admin\//.test(req.url())) apiCalls.push(req.url());
    });
    await page.goto("/");
    const ctas = page.getByRole("link", { name: "Quiero probar Lila" });
    await ctas.first().click();
    await expect(page).toHaveURL(/\/(#descargar)?$/);
    await expect(page.locator("#descargar")).toBeInViewport();
    await expect(page.getByRole("heading", { name: "Descarga Lila" })).toBeInViewport();
    expect(new URL(page.url()).pathname).toBe("/");
    expect(apiCalls).toEqual([]);
  });

  test("plan CTAs also point to #descargar", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Empezar gratis", "Elegir Premium"]) {
      await expect(page.getByRole("link", { name })).toHaveAttribute("href", "#descargar");
    }
  });

  test("store buttons open the store links in a new tab", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#descargar");
    for (const [name, href] of [
      ["Descarga Lila en el App Store", STORE_LINKS.appStore],
      ["Descarga Lila en Google Play", STORE_LINKS.playStore],
    ] as const) {
      const link = section.getByRole("link", { name });
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("href", href);
    }
  });

  test("no landing link points to /login", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href]").evaluateAll((els) =>
      els.map((el) => el.getAttribute("href")),
    );
    expect(hrefs.filter((h) => h?.includes("/login"))).toEqual([]);
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

    const [appStore, playStore] = await Promise.all([
      page.locator("#descargar").getByRole("link", { name: /App Store/ }).boundingBox(),
      page.locator("#descargar").getByRole("link", { name: /Google Play/ }).boundingBox(),
    ]);
    expect(appStore && playStore).toBeTruthy();
    expect(playStore!.y).toBeGreaterThan(appStore!.y + appStore!.height - 1);
    expect(Math.abs(appStore!.width - playStore!.width)).toBeLessThan(1);
    expect(appStore!.width).toBeGreaterThan(300);
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
