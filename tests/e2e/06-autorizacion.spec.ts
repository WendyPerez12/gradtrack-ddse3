import { expect, test } from "@playwright/test";
import { CREDENCIALES, login, thesisIdByStudentEmail } from "./helpers";

test.describe("E2E 6 — La autorización se verifica en el servidor", () => {
  test("un director no accede al trabajo de otro director (CA-06)", async ({ page }) => {
    // Diana Carolina Pineda la dirige Camilo Arango (director2).
    const ajeno = await thesisIdByStudentEmail("estudiante3@gradtrack.test");

    await login(page, CREDENCIALES.director1);
    await page.goto(`/trabajos/${ajeno}`);

    await expect(page.getByText("No encontramos esta página")).toBeVisible();
  });

  test("un coordinador no ve los trabajos de otro programa (CA-07)", async ({ page }) => {
    const ajeno = await thesisIdByStudentEmail("estudiante.ing@gradtrack.test");

    await login(page, CREDENCIALES.coordinador);
    await page.goto(`/trabajos/${ajeno}`);
    await expect(page.getByText("No encontramos esta página")).toBeVisible();

    // Tampoco aparece en su listado.
    await page.goto("/trabajos");
    await expect(page.getByText("Paula Andrea Gómez")).toHaveCount(0);
  });

  test("sin sesión no se llega a las rutas privadas", async ({ page }) => {
    await page.goto("/panel");
    await page.waitForURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  });
});
