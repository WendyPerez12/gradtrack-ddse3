/**
 * Errores de aplicación. Nunca se envían stack traces, SQL ni secretos al
 * cliente: cada error expone un mensaje pensado para la persona que lo lee.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "INTERNAL",
    readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Debes iniciar sesión para continuar.") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "El recurso solicitado no existe.") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Revisa los datos del formulario.",
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message, "VALIDATION", 422);
  }
}

export class ConflictError extends AppError {
  constructor(message = "La operación entra en conflicto con el estado actual.") {
    super(message, "CONFLICT", 409);
  }
}

/** Resultado uniforme de las Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; code: AppError["code"]; fieldErrors?: Record<string, string[]> };

/** Convierte cualquier excepción en un ActionResult seguro para el cliente. */
export function toActionError(error: unknown): Extract<ActionResult, { ok: false }> {
  if (error instanceof ValidationError) {
    return { ok: false, error: error.message, code: error.code, fieldErrors: error.fieldErrors };
  }
  if (error instanceof AppError) {
    return { ok: false, error: error.message, code: error.code };
  }
  // Solo el servidor ve el detalle real.
  console.error("[gradtrack] error no controlado:", error);
  return {
    ok: false,
    error: "Ocurrió un error inesperado. Intenta de nuevo; si persiste, avisa a soporte.",
    code: "INTERNAL",
  };
}
