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

/** Choques de restricciones de la base, traducidos a lenguaje de usuario. */
function fromPrismaError(error: unknown): AppError | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = (error as { code?: string }).code;

  // P2002: índice único. Ocurre cuando dos personas hacen lo mismo a la vez y
  // la comprobación previa del servicio no alcanzó a verlo.
  if (code === "P2002") {
    return new ConflictError(
      "Otra persona acaba de registrar algo que entra en conflicto con esta operación. Actualiza la página y vuelve a intentarlo.",
    );
  }
  // P2003: llave foránea. P2025: el registro ya no existe.
  if (code === "P2003") {
    return new ValidationError("Alguno de los datos seleccionados ya no existe.");
  }
  if (code === "P2025") {
    return new NotFoundError("El registro ya no existe: puede que alguien lo haya cambiado.");
  }
  return null;
}

/** Convierte cualquier excepción en un ActionResult seguro para el cliente. */
export function toActionError(error: unknown): Extract<ActionResult, { ok: false }> {
  const mapped = fromPrismaError(error);
  if (mapped) {
    return { ok: false, error: mapped.message, code: mapped.code };
  }
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
