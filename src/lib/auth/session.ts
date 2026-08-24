import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError } from "@/lib/errors";
import type { Actor, ActorRole } from "@/lib/permissions/rules";

/**
 * Actor autenticado o null. Úsalo cuando la ausencia de sesión es válida.
 *
 * La sesión va firmada, pero puede haber quedado obsoleta: administración pudo
 * desactivar la cuenta, cambiarle el rol, moverla de programa o restablecerle
 * la contraseña después de emitir el token. Por eso el estado se relee de la
 * base en cada petición: si no, desactivar a alguien no lo sacaría del sistema
 * hasta que expirara su sesión.
 */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      active: true,
      mustChangePassword: true,
      sessionsRevokedAt: true,
      memberships: { select: { programId: true } },
      studentProfile: { select: { id: true, programId: true } },
    },
  });

  if (!user || !user.active) return null;

  // Cuando administración restablece una contraseña, las sesiones que ya
  // estaban abiertas dejan de valer. Cambiar la propia no revoca nada: sería
  // absurdo expulsar a quien acaba de hacerlo bien.
  const sessionStartedAt = session.user.sessionStartedAt ?? 0;
  if (user.sessionsRevokedAt && user.sessionsRevokedAt.getTime() > sessionStartedAt) {
    return null;
  }

  const programIds = new Set(user.memberships.map((m) => m.programId));
  if (user.studentProfile?.programId) programIds.add(user.studentProfile.programId);

  return {
    id: user.id,
    role: user.role,
    programIds: [...programIds],
    studentProfileId: user.studentProfile?.id ?? null,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Actor autenticado; redirige a /login si no hay sesión. Para páginas. */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  return actor;
}

/** Actor con uno de los roles indicados; lanza si no. Para Server Actions. */
export async function requireRole(roles: ActorRole[]): Promise<Actor> {
  const actor = await requireActor();
  if (!roles.includes(actor.role)) {
    throw new ForbiddenError("Tu rol no permite realizar esta acción.");
  }
  return actor;
}

/** Nombre legible del rol para la interfaz. */
export const ROLE_LABEL: Record<ActorRole, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador",
  DIRECTOR: "Director",
  CODIRECTOR: "Codirector",
  ESTUDIANTE: "Estudiante",
};
