import { expect, test } from "@playwright/test";
import { CREDENCIALES, login } from "./helpers";

test.describe("E2E 1 — El coordinador consulta el seguimiento", () => {
  test("inicia sesión, ve el panel y abre la ficha de un estudiante", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);

    await expect(page.getByRole("heading", { name: "Panel de seguimiento" })).toBeVisible();

    // Indicadores del §34.
    await expect(page.getByText("Trabajos activos")).toBeVisible();
    await expect(page.getByText("Al día", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("En alerta")).toBeVisible();

    // La bandeja de alertas tempranas muestra el caso crítico del seed.
    await expect(page.getByText("Alertas tempranas")).toBeVisible();
    await expect(page.getByRole("link", { name: /Diana Carolina Pineda/ }).first()).toBeVisible();

    // Abre la ficha del estudiante al día.
    await page.getByRole("link", { name: "Laura Restrepo Vélez" }).first().click();
    await page.waitForURL(/\/trabajos\/.+/);

    await expect(page.getByRole("heading", { name: "Laura Restrepo Vélez" })).toBeVisible();
    await expect(page.getByText("Equipo de acompañamiento")).toBeVisible();
    await expect(page.getByText("Hernán Ocampo").first()).toBeVisible();
    await expect(page.getByText("2 de 2").first()).toBeVisible();
  });
});
