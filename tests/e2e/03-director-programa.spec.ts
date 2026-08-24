import { expect, test } from "@playwright/test";
import { CREDENCIALES, isoDaysFromNow, login } from "./helpers";

test.describe("E2E 3 — El director programa una asesoría", () => {
  test("ve sus dirigidos y agenda una nueva sesión", async ({ page }) => {
    await login(page, CREDENCIALES.director1);

    await expect(page.getByRole("heading", { name: "Panel del director" })).toBeVisible();
    await expect(page.getByText("Trabajos asignados")).toBeVisible();

    await page.getByRole("link", { name: "Laura Restrepo Vélez" }).first().click();
    await page.waitForURL(/\/trabajos\/.+/);

    await page.getByRole("button", { name: "Programar asesoría" }).first().click();
    await page.getByLabel("Fecha").fill(isoDaysFromNow(7));
    await page.getByLabel("Hora").fill("10:00");
    await page.getByLabel("Modalidad").selectOption("VIRTUAL");
    await page.getByLabel("Tema o propósito").fill("Revisión de la matriz bibliográfica");
    await page.getByRole("button", { name: "Programar", exact: true }).click();

    await expect(page.getByText("Revisión de la matriz bibliográfica").first()).toBeVisible();
    await expect(page.getByText("Programada").first()).toBeVisible();
  });
});
