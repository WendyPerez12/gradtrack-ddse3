import { expect, test } from "@playwright/test";
import { CREDENCIALES, isoDaysFromNow, login, thesisIdByStudentEmail } from "./helpers";

test.describe("E2E 7 — Ajustes posteriores a la revisión", () => {
  test("una URL con un filtro inventado no rompe la página", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);

    await page.goto("/asesorias?estado=FOO");
    await expect(page.getByRole("heading", { name: "Asesorías" })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);

    await page.goto("/alertas?estado=BAR");
    await expect(page.getByRole("heading", { name: "Alertas tempranas" })).toBeVisible();
    await expect(page.getByText("Algo salió mal")).toHaveCount(0);
  });

  test("el coordinador edita el título y el estado del trabajo", async ({ page }) => {
    const thesisId = await thesisIdByStudentEmail("estudiante1@gradtrack.test");
    await login(page, CREDENCIALES.coordinador);
    await page.goto(`/trabajos/${thesisId}`);

    await page.getByRole("button", { name: "Editar trabajo" }).click();
    await page
      .getByLabel("Título")
      .fill("Estrategias de evaluación formativa en instituciones rurales");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByText("Estrategias de evaluación formativa en instituciones rurales").first(),
    ).toBeVisible();
    await expect(page.getByText("Trabajo actualizado").first()).toBeVisible();
  });

  test("el director agrega un compromiso a una asesoría ya realizada", async ({ page }) => {
    const thesisId = await thesisIdByStudentEmail("estudiante1@gradtrack.test");
    await login(page, CREDENCIALES.director1);
    await page.goto(`/trabajos/${thesisId}`);

    await page.getByRole("button", { name: "Compromiso" }).first().click();
    await page
      .getByRole("textbox", { name: "Compromiso", exact: true })
      .fill("Ajustar la matriz de categorías");
    await page.getByLabel("Fecha límite").fill(isoDaysFromNow(14));
    await page.getByRole("button", { name: "Agregar" }).click();

    await expect(page.getByText("Ajustar la matriz de categorías").first()).toBeVisible();
  });

  test("el coordinador abre el siguiente periodo académico", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/configuracion");

    await page.getByRole("button", { name: "Nuevo periodo" }).first().click();
    await page.getByLabel("Nombre").fill("2027-1");
    await page.getByLabel("Fecha de inicio").fill(isoDaysFromNow(120));
    await page.getByLabel("Fecha de cierre").fill(isoDaysFromNow(240));
    await page.getByRole("button", { name: "Crear periodo" }).click();

    await expect(page.getByText("2027-1").first()).toBeVisible();
    await expect(page.getByText("Planeado").first()).toBeVisible();
  });

  test("no se puede crear dos veces el mismo periodo", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/configuracion");

    await page.getByRole("button", { name: "Nuevo periodo" }).first().click();
    await page.getByLabel("Nombre").fill("2026-2");
    await page.getByLabel("Fecha de inicio").fill(isoDaysFromNow(120));
    await page.getByLabel("Fecha de cierre").fill(isoDaysFromNow(240));
    await page.getByRole("button", { name: "Crear periodo" }).click();

    await expect(page.getByText(/ya tiene un periodo llamado 2026-2/)).toBeVisible();
  });
});

test.describe("E2E 8 — Gestión de alertas y estados del trabajo", () => {
  test("la gestión de una alerta sobrevive al recálculo", async ({ page }) => {
    const nota = "Cité al estudiante y al director para el viernes.";
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/alertas");

    await page.getByRole("button", { name: "Registrar gestión" }).first().click();
    await page.getByLabel("Nota de gestión").fill(nota);
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText(nota)).toBeVisible();
    await expect(page.getByText("En seguimiento").first()).toBeVisible();

    // Regresión: antes la alerta se cerraba y el siguiente recálculo la
    // volvía a crear, perdiendo la nota.
    await page.getByRole("button", { name: "Recalcular alertas" }).click();
    await expect(page.getByText(/Se revisaron \d+ trabajos/)).toBeVisible();

    await page.reload();
    await expect(page.getByText(nota)).toBeVisible();
    await expect(page.getByText("En seguimiento").first()).toBeVisible();
  });

  test("una alerta descartada no vuelve a levantarse en el periodo", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/alertas?estado=DISMISSED");

    const descartadas = page.locator("li").filter({ hasText: "Inactividad" });
    await expect(descartadas.first()).toBeVisible();

    await page.goto("/alertas");
    await page.getByRole("button", { name: "Recalcular alertas" }).click();
    await expect(page.getByText(/Se revisaron \d+ trabajos/)).toBeVisible();

    await page.goto("/alertas?estado=DISMISSED");
    await expect(descartadas.first()).toBeVisible();
  });

  test("un trabajo terminado no aparece como al día", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/trabajos?trabajo=COMPLETED");

    // Dentro de la tabla, no en las opciones del filtro.
    const tabla = page.getByRole("table");
    await expect(tabla.getByText("Terminado", { exact: true }).first()).toBeVisible();
    await expect(tabla.getByText("Al día", { exact: true })).toHaveCount(0);
  });
});
