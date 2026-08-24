import { expect, test } from "@playwright/test";
import { CREDENCIALES, login } from "./helpers";

test.describe("E2E 2 — Asignación de trabajo y director", () => {
  test("el coordinador crea un trabajo y asigna director", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);

    await page.getByRole("link", { name: "Nuevo trabajo" }).first().click();
    await page.waitForURL("**/trabajos/nuevo");

    // El estudiante de primer semestre que el seed deja sin trabajo asignado.
    const opcion = page.locator("option", { hasText: "Camila Andrea Torres" });
    await page.getByLabel("Estudiante").selectOption((await opcion.getAttribute("value"))!);

    await page
      .getByLabel("Título del trabajo")
      .fill("Evaluación del acompañamiento docente en programas de posgrado");
    await page.getByLabel("Director", { exact: true }).selectOption({ label: "Hernán Ocampo" });

    await page.getByRole("button", { name: "Crear trabajo" }).click();
    await page.waitForURL(/\/trabajos\/.+/);

    await expect(
      page.getByText("Evaluación del acompañamiento docente en programas de posgrado"),
    ).toBeVisible();
    await expect(page.getByText("Equipo de acompañamiento")).toBeVisible();
    await expect(page.getByText("Hernán Ocampo").first()).toBeVisible();

    // El histórico de asignación queda registrado.
    await expect(page.getByText("Director asignado").first()).toBeVisible();
  });

  test("el coordinador cambia el director conservando el histórico (CA-08)", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/trabajos");
    await page.getByRole("link", { name: "Andrés Felipe Mora" }).first().click();
    await page.waitForURL(/\/trabajos\/.+/);

    await page.getByRole("button", { name: "Cambiar director" }).click();
    await page.getByLabel("Docente").selectOption({ label: "Camilo Arango" });
    await page.getByLabel("Motivo del cambio").fill("Reasignación por carga académica");
    await page.getByRole("button", { name: "Asignar", exact: true }).click();

    await expect(page.getByText("Asignaciones anteriores")).toBeVisible();
    await expect(page.getByText(/Hernán Ocampo · director/).last()).toBeVisible();
  });
});
