import { expect, test } from "@playwright/test";
import { CREDENCIALES, login, thesisIdByStudentEmail } from "./helpers";

test.describe("E2E 5 — El estudiante consulta su proceso", () => {
  test("ve su trabajo, su historial y sus compromisos", async ({ page }) => {
    await login(page, CREDENCIALES.estudiante1);

    await expect(page.getByRole("heading", { name: "Mi trabajo de grado" })).toBeVisible();
    await expect(page.getByText("Estrategias de evaluación formativa en la educación media rural")).toBeVisible();
    await expect(page.getByText("Hernán Ocampo").first()).toBeVisible();
    await expect(page.getByText("Historial de asesorías")).toBeVisible();
    await expect(page.getByText("Compromisos pendientes").first()).toBeVisible();

    // No tiene acciones de escritura: no puede confirmar asesorías (§11).
    await expect(page.getByRole("button", { name: "Marcar realizada" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Programar asesoría" })).toHaveCount(0);
  });

  test("no puede abrir el trabajo de otro estudiante (CA-05)", async ({ page }) => {
    const ajeno = await thesisIdByStudentEmail("estudiante3@gradtrack.test");
    await login(page, CREDENCIALES.estudiante1);

    await page.goto(`/trabajos/${ajeno}`);
    await expect(page.getByText("No encontramos esta página")).toBeVisible();
  });
});
