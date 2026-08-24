import type { ZodType } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Valida la entrada de una Server Action y traduce los errores de Zod al
 * formato que consumen los formularios (`fieldErrors` por campo).
 *
 * Toda mutación pasa por aquí: la validación del cliente es comodidad, esta es
 * la que cuenta.
 */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw new ValidationError("Revisa los datos del formulario.", fieldErrors);
}
