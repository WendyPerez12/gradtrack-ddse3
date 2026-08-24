import { z } from "zod";

/**
 * Validación de variables de entorno. Falla temprano y con un mensaje claro
 * en lugar de romper en medio de una petición.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET debe tener al menos 16 caracteres"),
  NEXTAUTH_URL: z.string().url().optional(),
  APP_TIMEZONE: z.string().min(1).default("America/Bogota"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    // AUTH_SECRET es el nombre nuevo; NEXTAUTH_SECRET el que lee next-auth v4.
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuración de entorno inválida. ${detail}`);
  }

  cached = parsed.data;
  return cached;
}

/** Zona horaria institucional para presentar fechas. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Bogota";
