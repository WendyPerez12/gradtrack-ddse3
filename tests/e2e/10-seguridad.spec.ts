import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import { CREDENCIALES, login } from "./helpers";

const psql = (sql: string) =>
  execSync(
    `PGPASSWORD=gradtrack_dev /opt/homebrew/opt/postgresql@15/bin/psql -h localhost -U gradtrack -d gradtrack -c "${sql}"`,
    { stdio: "ignore" },
  );

test.describe("E2E 10 — Hallazgos de la revisión de seguridad", () => {
  test("un estudiante ve sus alertas pero no puede silenciarlas", async ({ page }) => {
    // Regresión: podía descartar su propia alerta crítica y desaparecer de la
    // bandeja de la coordinación durante todo el periodo.
    await login(page, { email: "estudiante3@gradtrack.test", password: "Estudiante123*" });
    await page.goto("/alertas");

    await expect(page.getByText(/Sin ninguna asesoría realizada/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Descartar" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Registrar gestión" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Recalcular/ })).toHaveCount(0);
  });

  test("la coordinación sí puede gestionarlas", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/alertas");
    await expect(page.getByRole("button", { name: "Registrar gestión" }).first()).toBeVisible();
  });

  test("desactivar una cuenta corta su sesión abierta", async ({ page }) => {
    // Regresión: la sesión firmada seguía siendo válida hasta ocho horas, así
    // que desactivar a alguien no lo sacaba del sistema.
    await login(page, CREDENCIALES.director1);
    psql("update users set active=false where email='director1@gradtrack.test';");
    try {
      await page.goto("/trabajos");
      await page.waitForURL(/\/login/);
      await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    } finally {
      psql("update users set active=true where email='director1@gradtrack.test';");
    }
  });

  test("restablecer la contraseña cierra las sesiones abiertas de esa cuenta", async ({ browser }) => {
    const docente = await browser.newContext();
    const paginaDocente = await docente.newPage();
    await login(paginaDocente, CREDENCIALES.director2);

    const admin = await browser.newContext();
    const paginaAdmin = await admin.newPage();
    await login(paginaAdmin, { email: "admin@gradtrack.test", password: "Admin123*" });
    await paginaAdmin.goto("/usuarios?q=director2@gradtrack.test");
    await paginaAdmin.getByRole("button", { name: "Contraseña" }).first().click();
    const dialogo = paginaAdmin.getByRole("dialog");
    await dialogo.locator('input[name="password"]').fill("Rectoria9911");
    await dialogo.getByRole("button", { name: "Asignar" }).click();
    await expect(paginaAdmin.getByText(/Contraseña temporal asignada/)).toBeVisible();

    await paginaDocente.goto("/trabajos");
    await paginaDocente.waitForURL(/\/login/);

    await docente.close();
    await admin.close();
  });
});
