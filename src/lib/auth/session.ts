import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { ForbiddenError } from "@/lib/errors";
import type { Actor, ActorRole } from "@/lib/permissions/rules";

/** Actor autenticado o null. Úsalo cuando la ausencia de sesión es válida. */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    programIds: session.user.programIds ?? [],
    studentProfileId: session.user.studentProfileId ?? null,
    mustChangePassword: Boolean(session.user.mustChangePassword),
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
