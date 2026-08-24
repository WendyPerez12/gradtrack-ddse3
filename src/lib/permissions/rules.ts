/**
 * Reglas de autorización puras (sin acceso a base de datos) para poder
 * probarlas de forma aislada. Los guards del servidor las consumen después de
 * cargar el contexto real desde Prisma.
 *
 * Regla de oro: ocultar un botón en el cliente no es autorización. Toda acción
 * pasa por estas reglas en el servidor.
 */

export type ActorRole = "ADMIN" | "COORDINADOR" | "DIRECTOR" | "CODIRECTOR" | "ESTUDIANTE";

export interface Actor {
  id: string;
  role: ActorRole;
  /** Programas que el usuario administra o atiende. */
  programIds: string[];
  /** Perfil de estudiante, si la cuenta es de un estudiante. */
  studentProfileId: string | null;
  /** La contraseña la fijó administración y debe cambiarse. */
  mustChangePassword?: boolean;
}

export interface ThesisAccessContext {
  thesisId: string;
  programId: string;
  /** userId del estudiante dueño del trabajo. */
  studentUserId: string;
  /** userIds con supervisión ACTIVA (director o codirector). */
  activeSupervisorIds: string[];
  /** userIds con cualquier supervisión, incluida la histórica. */
  allSupervisorIds: string[];
}

const isAdmin = (actor: Actor) => actor.role === "ADMIN";
const coordinates = (actor: Actor, programId: string) =>
  actor.role === "COORDINADOR" && actor.programIds.includes(programId);

/** ¿Puede el usuario ver este trabajo de grado? (CA-05, CA-06, CA-07) */
export function canUserAccessThesis(actor: Actor, thesis: ThesisAccessContext): boolean {
  if (isAdmin(actor)) return true;
  if (coordinates(actor, thesis.programId)) return true;
  // Un docente ve el trabajo si participa o participó como director/codirector.
  if (thesis.allSupervisorIds.includes(actor.id)) return true;
  // El estudiante solo ve el suyo.
  if (actor.role === "ESTUDIANTE") return thesis.studentUserId === actor.id;
  return false;
}

/** ¿Puede programar, editar, reprogramar o cancelar asesorías de este trabajo? */
export function canUserManageAdvisories(actor: Actor, thesis: ThesisAccessContext): boolean {
  if (isAdmin(actor)) return true;
  if (coordinates(actor, thesis.programId)) return true;
  // Solo supervisión vigente: un director anterior conserva lectura, no escritura.
  return thesis.activeSupervisorIds.includes(actor.id);
}

/**
 * ¿Puede confirmar que una asesoría se realizó? (§21, §41)
 * El estudiante nunca puede: la confirmación es la evidencia del proceso.
 * El coordinador tampoco en esta versión; ver docs/ROLES_AND_PERMISSIONS.md.
 */
export function canUserConfirmAdvisory(actor: Actor, thesis: ThesisAccessContext): boolean {
  if (isAdmin(actor)) return true;
  return thesis.activeSupervisorIds.includes(actor.id);
}

/** ¿Puede crear trabajos y asignar o cambiar director/codirector? */
export function canUserManageThesisAssignment(actor: Actor, programId: string): boolean {
  return isAdmin(actor) || coordinates(actor, programId);
}

/** ¿Puede ver la información agregada del programa (dashboard, reportes)? */
export function canUserViewProgram(actor: Actor, programId: string): boolean {
  return isAdmin(actor) || actor.programIds.includes(programId);
}

/** ¿Puede editar la configuración de umbrales del programa? (§25) */
export function canUserEditProgramSettings(actor: Actor, programId: string): boolean {
  return isAdmin(actor) || coordinates(actor, programId);
}

/**
 * Gestión de cuentas: crear, editar, activar, desactivar y restablecer
 * contraseñas. Reservada a administración (§11).
 */
export function canUserManageUsers(actor: Actor): boolean {
  return actor.role === "ADMIN";
}

/**
 * Consultar el directorio de personas. La coordinación puede ver a quienes
 * pertenecen a sus programas, sin poder modificarlos.
 */
export function canUserViewUsers(actor: Actor): boolean {
  return actor.role === "ADMIN" || actor.role === "COORDINADOR";
}

/** Programas sobre los que el actor puede consultar información. */
export function visibleProgramIds(actor: Actor, allProgramIds: string[]): string[] {
  if (isAdmin(actor)) return allProgramIds;
  return allProgramIds.filter((id) => actor.programIds.includes(id));
}
