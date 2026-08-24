import { expect, test } from "@playwright/test";
import { CREDENCIALES, login } from "./helpers";

const ADMIN = { email: "admin@gradtrack.test", password: "Admin123*" };

test.describe("E2E 9 — Administración de cuentas", () => {
  test("el administrador crea una cuenta de estudiante", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/usuarios");

    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
    await page.getByRole("button", { name: "Nueva cuenta" }).click();

    // Acotado al diálogo: los mismos rótulos existen en los filtros de la página.
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Nombre completo").fill("Tatiana Herrera Lozano");
    await dialogo.getByLabel("Correo electrónico").fill("tatiana.herrera@gradtrack.test");
    await dialogo.getByLabel("Rol").selectOption("ESTUDIANTE");
    await dialogo.getByLabel(/Maestría en Educación/).check();
    await dialogo.getByLabel("Código del estudiante").fill("MED-2026-500");
    await dialogo.getByRole("button", { name: "Sugerir" }).click();
    await dialogo.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByText(/Cuenta creada para Tatiana/)).toBeVisible();

    await page.goto("/usuarios?q=tatiana");
    await expect(page.getByText("tatiana.herrera@gradtrack.test")).toBeVisible();
    await expect(page.getByText("Contraseña temporal").first()).toBeVisible();
  });

  test("no se permiten dos cuentas con el mismo correo", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/usuarios");

    await page.getByRole("button", { name: "Nueva cuenta" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Nombre completo").fill("Duplicado de prueba");
    await dialogo.getByLabel("Correo electrónico").fill("director1@gradtrack.test");
    await dialogo.getByLabel("Rol").selectOption("DIRECTOR");
    await dialogo.getByLabel(/Maestría en Educación/).check();
    await dialogo.locator('input[name="password"]').fill("Aula2026");
    await dialogo.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByText(/Ya existe una cuenta con ese correo/)).toBeVisible();
  });

  test("una contraseña temporal obliga a cambiarla antes de entrar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill("nuevo.docente@gradtrack.test");
    await page.getByLabel("Contraseña").fill("Aula2026");
    await page.getByRole("button", { name: "Entrar" }).click();

    // El sistema no la deja llegar al panel.
    await page.waitForURL(/\/mi-cuenta/);
    await expect(page.getByText("Cambia tu contraseña para continuar")).toBeVisible();

    // Ni siquiera navegando a mano.
    await page.goto("/panel");
    await page.waitForURL(/\/mi-cuenta/);

    // Por nombre de campo: "Contraseña nueva" también coincide con "Repite la
    // contraseña nueva" si se busca por rótulo.
    await page.locator('input[name="currentPassword"]').fill("Aula2026");
    await page.locator('input[name="newPassword"]').fill("Campus2027");
    await page.locator('input[name="confirmPassword"]').fill("Campus2027");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();

    await page.waitForURL(/\/panel/);
    await expect(page.getByRole("heading", { name: "Panel del director" })).toBeVisible();
  });

  test("la contraseña nueva es la que sirve para volver a entrar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill("nuevo.docente@gradtrack.test");
    await page.getByLabel("Contraseña").fill("Campus2027");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/panel");
    await expect(page.getByRole("heading", { name: "Panel del director" })).toBeVisible();
  });

  test("la coordinación consulta el directorio pero no gestiona cuentas", async ({ page }) => {
    await login(page, CREDENCIALES.coordinador);
    await page.goto("/usuarios");

    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
    await expect(page.getByText("Marcela Cifuentes").first()).toBeVisible();

    // Regresión: el programa de un estudiante vive en su perfil académico, no
    // en las membresías; filtrando solo por membresías no veía a ninguno.
    await page.goto("/usuarios?q=estudiante1@gradtrack.test");
    const tabla = page.getByRole("table");
    await expect(tabla.getByText("estudiante1@gradtrack.test")).toBeVisible();
    await expect(tabla.getByText("MED", { exact: true }).first()).toBeVisible();

    await expect(page.getByRole("button", { name: "Nueva cuenta" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  });

  test("un director no llega al directorio", async ({ page }) => {
    await login(page, CREDENCIALES.director1);
    await page.goto("/usuarios");
    await page.waitForURL(/\/panel/);
  });
});
