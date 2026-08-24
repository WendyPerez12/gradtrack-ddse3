/**
 * Los parámetros de URL son entrada del usuario: cualquiera puede escribir
 * `?estado=FOO`. Antes de que un valor así llegue a una consulta de Prisma
 * tiene que pasar por una lista blanca, o el enum inválido revienta la página.
 */
export function pickEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/** Igual que `pickEnum`, pero con un valor por defecto obligatorio. */
export function pickEnumOr<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return pickEnum(value, allowed) ?? fallback;
}

export const ADVISORY_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "NOT_COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
] as const;

export const ALERT_STATUSES = ["ACTIVE", "RESOLVED", "DISMISSED"] as const;

export const MONITORING_STATUSES = ["ON_TRACK", "FOLLOW_UP", "ALERT"] as const;
