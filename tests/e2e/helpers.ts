import { expect, type Page } from "@playwright/test";
import { Client } from "pg";
import "dotenv/config";

/**
 * Los helpers consultan la base con `pg` en lugar del cliente de Prisma:
 * el cliente generado por Prisma 7 es solo ESM y el cargador de Playwright
 * transpila a CommonJS. Para leer un id en una prueba, SQL plano sobra.
 */

export const CREDENCIALES = {
  admin: { email: "admin@gradtrack.test", password: "Admin123*" },
  coordinador: { email: "coordinacion@gradtrack.test", password: "Coord123*" },
  director1: { email: "director1@gradtrack.test", password: "Director123*" },
  director2: { email: "director2@gradtrack.test", password: "Director123*" },
  estudiante1: { email: "estudiante1@gradtrack.test", password: "Estudiante123*" },
  estudiante3: { email: "estudiante3@gradtrack.test", password: "Estudiante123*" },
};

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/panel");
}

async function queryOne<T>(sql: string, params: unknown[]): Promise<T | null> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return (result.rows[0] as T) ?? null;
  } finally {
    await client.end();
  }
}

/** Id del trabajo de grado activo de un estudiante, por su correo. */
export async function thesisIdByStudentEmail(email: string): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `SELECT t.id
       FROM theses t
       JOIN student_profiles sp ON sp.id = t."studentId"
       JOIN users u ON u.id = sp."userId"
      WHERE u.email = $1 AND t.status = 'ACTIVE'
      LIMIT 1`,
    [email],
  );
  expect(row, `No se encontró el trabajo activo de ${email}`).not.toBeNull();
  return row!.id;
}

export function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
