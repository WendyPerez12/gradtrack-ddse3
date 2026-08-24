import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  canUserAccessThesis,
  canUserConfirmAdvisory,
  canUserManageAdvisories,
  canUserManageAlerts,
  canUserManageThesisAssignment,
  type Actor,
  type ThesisAccessContext,
} from "@/lib/permissions/rules";

/** Carga el contexto de autorización de un trabajo desde la base. */
export async function loadThesisAccessContext(thesisId: string): Promise<ThesisAccessContext> {
  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    select: {
      id: true,
      programId: true,
      student: { select: { userId: true } },
      supervisions: { select: { userId: true, active: true } },
    },
  });

  if (!thesis) throw new NotFoundError("El trabajo de grado no existe.");

  return {
    thesisId: thesis.id,
    programId: thesis.programId,
    studentUserId: thesis.student.userId,
    activeSupervisorIds: thesis.supervisions.filter((s) => s.active).map((s) => s.userId),
    allSupervisorIds: thesis.supervisions.map((s) => s.userId),
  };
}

/**
 * Verifica en servidor que el actor puede ver el trabajo.
 * Devuelve NotFound —no Forbidden— cuando no tiene acceso: así cambiar el id
 * en la URL no revela qué trabajos existen (§45).
 */
export async function requireThesisAccess(
  actor: Actor,
  thesisId: string,
): Promise<ThesisAccessContext> {
  const context = await loadThesisAccessContext(thesisId);
  if (!canUserAccessThesis(actor, context)) {
    throw new NotFoundError("El trabajo de grado no existe o no tienes acceso.");
  }
  return context;
}

export async function requireAdvisoryManagement(
  actor: Actor,
  thesisId: string,
): Promise<ThesisAccessContext> {
  const context = await requireThesisAccess(actor, thesisId);
  if (!canUserManageAdvisories(actor, context)) {
    throw new ForbiddenError("No puedes gestionar las asesorías de este trabajo.");
  }
  return context;
}

export async function requireAdvisoryConfirmation(
  actor: Actor,
  thesisId: string,
): Promise<ThesisAccessContext> {
  const context = await requireThesisAccess(actor, thesisId);
  if (!canUserConfirmAdvisory(actor, context)) {
    throw new ForbiddenError(
      "Solo el director o el codirector activo pueden confirmar que la asesoría se realizó.",
    );
  }
  return context;
}

export async function requireAlertManagement(
  actor: Actor,
  thesisId: string,
): Promise<ThesisAccessContext> {
  const context = await requireThesisAccess(actor, thesisId);
  if (!canUserManageAlerts(actor, context)) {
    throw new ForbiddenError("No puedes gestionar las alertas de este trabajo.");
  }
  return context;
}

export async function requireAssignmentManagement(actor: Actor, programId: string): Promise<void> {
  if (!canUserManageThesisAssignment(actor, programId)) {
    throw new ForbiddenError("No administras este programa académico.");
  }
}

/** Programas visibles para el actor, ya filtrados en la consulta. */
export async function listVisiblePrograms(actor: Actor) {
  return prisma.program.findMany({
    where: actor.role === "ADMIN" ? { active: true } : { active: true, id: { in: actor.programIds } },
    orderBy: { name: "asc" },
  });
}

/** Cláusula `where` de Prisma que limita los trabajos visibles para el actor. */
export function thesisScopeWhere(actor: Actor) {
  switch (actor.role) {
    case "ADMIN":
      return {};
    case "COORDINADOR":
      return { programId: { in: actor.programIds } };
    case "ESTUDIANTE":
      return { student: { userId: actor.id } };
    default:
      // Docentes: trabajos donde participan o participaron.
      return { supervisions: { some: { userId: actor.id } } };
  }
}
