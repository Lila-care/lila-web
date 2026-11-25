import { test, expect } from "@playwright/test";
import { DELETE_ACCOUNT_MAILTO } from "../src/DeleteAccount/deleteAccountContent";

test.describe("/eliminar-cuenta", () => {
  test("opens without login and offers the email request", async ({ page }) => {
    await page.goto("/eliminar-cuenta");
    await expect(page).toHaveURL(/\/eliminar-cuenta$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Eliminar tu cuenta de Lila" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "contacto@lilacareapp.com" })).toHaveAttribute(
      "href",
      DELETE_ACCOUNT_MAILTO,
    );
    for (const name of ["Qué se elimina", "Qué se conserva"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });

  test("has no horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/eliminar-cuenta");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
