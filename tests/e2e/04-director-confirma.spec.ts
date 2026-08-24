import { expect, test } from "@playwright/test";
import { CREDENCIALES, isoDaysFromNow, login, thesisIdByStudentEmail } from "./helpers";

test.describe("E2E 4 — El director confirma la asesoría", () => {
  test("marca realizada, registra asistencia, compromiso y próxima fecha", async ({ page }) => {
    const thesisId = await thesisIdByStudentEmail("estudiante4@gradtrack.test");
    await login(page, CREDENCIALES.director2);
    await page.goto(`/trabajos/${thesisId}`);

    // El seed deja una asesoría programada que ya venció.
    await page.getByRole("button", { name: "Marcar realizada" }).first().click();

    await page.getByLabel("Fecha real").fill(isoDaysFromNow(0));
    await page.getByLabel("Tema tratado").fill("Avance del capítulo metodológico");
    await page.getByLabel("Resumen de la sesión").fill("Se revisó el diseño muestral completo.");
    await page.getByLabel("Compromiso 1").fill("Entregar el instrumento corregido");
    await page.getByRole("textbox", { name: "Próxima asesoría" }).fill(isoDaysFromNow(21));
    await page.getByLabel("Tema de la próxima").fill("Revisión del instrumento");

    await page.getByRole("button", { name: "Registrar asesoría" }).click();

    // La asesoría pasa a contar para el mínimo del periodo (CA-04, CA-10).
    await expect(page.getByText("2 de 2").first()).toBeVisible();
    await expect(page.getByText("Avance del capítulo metodológico").first()).toBeVisible();
    await expect(page.getByText("Entregar el instrumento corregido").first()).toBeVisible();

    // Y se creó la siguiente asesoría programada.
    await expect(page.getByText("Revisión del instrumento").first()).toBeVisible();

    // El estado del trabajo mejora en el panel del coordinador (CA-10).
    await page.goto("/panel");
    await expect(page.getByRole("heading", { name: "Panel del director" })).toBeVisible();
  });
});
