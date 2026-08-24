import bcrypt from "bcryptjs";
import type { Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/rules";
import { recordAudit } from "@/modules/audit/audit-service";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validations/user";

const BCRYPT_ROUNDS = 10;

async function assertProgramsExist(programIds: string[]): Promise<void> {
  if (programIds.length === 0) return;
  const found = await prisma.program.count({ where: { id: { in: programIds } } });
  if (found !== programIds.length) {
    throw new ValidationError("Alguno de los programas seleccionados no existe.");
  }
}

/**
 * Crea una cuenta. Si es de estudiante, crea también su perfil académico en la
 * misma transacción: una cuenta de estudiante sin perfil no sirve para nada.
 */
export async function createUser(actor: Actor, input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese correo electrónico.");
  }

  await assertProgramsExist(input.programIds);

  if (input.role === "ESTUDIANTE" && input.studentCode) {
    const duplicated = await prisma.studentProfile.findUnique({
      where: { studentCode: input.studentCode },
      select: { id: true },
    });
    if (duplicated) {
      throw new ConflictError(`Ya existe un estudiante con el código ${input.studentCode}.`);
    }
    if (input.cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: input.cohortId },
        select: { programId: true },
      });
      if (!cohort || cohort.programId !== input.programIds[0]) {
        throw new ValidationError("La cohorte no pertenece al programa seleccionado.", {
          cohortId: ["Elige una cohorte del mismo programa."],
        });
      }
    }
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role as UserRole,
        // La contraseña la fijó administración: el titular debe cambiarla.
        mustChangePassword: true,
        // Las membresías vinculan coordinación y docentes con sus programas.
        // El estudiante se vincula por su perfil académico (ver schema.prisma).
        memberships:
          input.role === "ESTUDIANTE"
            ? undefined
            : {
                create: input.programIds.map((programId) => ({
                  programId,
                  role: input.role as UserRole,
                })),
              },
        ...(input.role === "ESTUDIANTE"
          ? {
              studentProfile: {
                create: {
                  programId: input.programIds[0]!,
                  cohortId: input.cohortId || null,
                  studentCode: input.studentCode!.trim(),
                  currentSemester: input.currentSemester ?? 1,
                },
              },
            }
          : {}),
      },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role, programIds: input.programIds },
      },
      tx,
    );

    return user;
  });
}

/** Actualiza los datos de la cuenta y sus vínculos con programas. */
export async function updateUser(actor: Actor, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, role: true, email: true, studentProfile: { select: { id: true } } },
  });
  if (!user) throw new NotFoundError("La cuenta no existe.");

  if (input.email !== user.email) {
    const taken = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (taken && taken.id !== user.id) {
      throw new ConflictError("Ya existe otra cuenta con ese correo electrónico.");
    }
  }

  // Cambiar el rol de una cuenta con historial académico rompería la
  // integridad de lo ya registrado.
  if (user.studentProfile && input.role !== "ESTUDIANTE") {
    throw new ValidationError(
      "Esta cuenta tiene perfil de estudiante y no puede cambiar de rol. Desactívala y crea una nueva si es necesario.",
    );
  }
  if (!user.studentProfile && input.role === "ESTUDIANTE") {
    throw new ValidationError(
      "Para convertir una cuenta en estudiante hay que crearla como tal: necesita código y programa.",
    );
  }

  await assertProgramsExist(input.programIds);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { name: input.name, email: input.email, role: input.role as UserRole },
    });

    if (input.role === "ESTUDIANTE") {
      // Su vínculo con el programa está en el perfil académico.
      await tx.programMembership.deleteMany({ where: { userId: user.id } });
    } else {
      // Los vínculos se reemplazan por el conjunto enviado.
      await tx.programMembership.deleteMany({
        where: { userId: user.id, programId: { notIn: input.programIds } },
      });
      for (const programId of input.programIds) {
        await tx.programMembership.upsert({
          where: { userId_programId: { userId: user.id, programId } },
          create: { userId: user.id, programId, role: input.role as UserRole },
          update: { role: input.role as UserRole },
        });
      }
    }

    if (user.studentProfile) {
      await tx.studentProfile.update({
        where: { id: user.studentProfile.id },
        data: {
          cohortId: input.cohortId || null,
          currentSemester: input.currentSemester ?? undefined,
          ...(input.studentCode ? { studentCode: input.studentCode.trim() } : {}),
          ...(input.programIds[0] ? { programId: input.programIds[0] } : {}),
        },
      });
    }

    await recordAudit(
      {
        userId: actor.id,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: user.id,
        metadata: { email: input.email, role: input.role, programIds: input.programIds },
      },
      tx,
    );

    return updated;
  });
}

/**
 * Baja lógica. Nunca se borra una cuenta con historial académico: las asesorías
 * confirmadas y las asignaciones apuntan a ella (§13, §74).
 */
export async function setUserActive(actor: Actor, userId: string, active: boolean) {
  if (actor.id === userId && !active) {
    throw new ValidationError("No puedes desactivar tu propia cuenta.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, active: true },
  });
  if (!user) throw new NotFoundError("La cuenta no existe.");

  if (!active) {
    const dirigiendo = await prisma.thesisSupervision.count({
      where: { userId, active: true, type: "DIRECTOR", thesis: { status: "ACTIVE" } },
    });
    if (dirigiendo > 0) {
      throw new ConflictError(
        `${user.name} dirige ${dirigiendo} trabajo(s) activo(s). Reasigna esas direcciones antes de desactivar la cuenta.`,
      );
    }
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { active } });

  await recordAudit({
    userId: actor.id,
    action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: userId,
    metadata: { name: user.name },
  });

  return updated;
}

/** Administración fija una contraseña temporal; el titular deberá cambiarla. */
export async function resetPassword(actor: Actor, userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new NotFoundError("La cuenta no existe.");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true, passwordUpdatedAt: new Date() },
  });

  await recordAudit({
    userId: actor.id,
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: userId,
    // Jamás se registra la contraseña, ni siquiera en la auditoría.
    metadata: { temporal: true },
  });
}

/** El titular cambia su propia contraseña, verificando la anterior. */
export async function changeOwnPassword(
  actor: Actor,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new NotFoundError("La cuenta no existe.");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new ValidationError("La contraseña actual no es correcta.", {
      currentPassword: ["No coincide con tu contraseña actual."],
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false, passwordUpdatedAt: new Date() },
  });

  await recordAudit({
    userId: actor.id,
    action: "USER_PASSWORD_CHANGED",
    entityType: "User",
    entityId: actor.id,
  });
}

export interface UserListParams {
  q?: string;
  rol?: string;
  programa?: string;
  estado?: string;
  page?: string;
}

/** Directorio de personas, limitado al alcance del actor. */
export async function listUsers(actor: Actor, params: UserListParams) {
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;

  const where: Prisma.UserWhereInput = {};
  const and: Prisma.UserWhereInput[] = [];

  // Una persona pertenece a un programa por membresía (coordinación y
  // docentes) o por su perfil académico (estudiantes). El directorio tiene que
  // mirar las dos: si no, la coordinación no vería a ningún estudiante.
  const perteneceA = (programIds: string[]): Prisma.UserWhereInput => ({
    OR: [
      { memberships: { some: { programId: { in: programIds } } } },
      { studentProfile: { programId: { in: programIds } } },
    ],
  });

  if (actor.role !== "ADMIN") and.push(perteneceA(actor.programIds));
  if (params.programa) and.push(perteneceA([params.programa]));
  if (params.rol) and.push({ role: params.rol as UserRole });
  if (params.estado === "INACTIVOS") and.push({ active: false });
  else if (params.estado !== "TODOS") and.push({ active: true });
  if (params.q?.trim()) {
    const q = params.q.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { studentProfile: { studentCode: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (and.length > 0) where.AND = and;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
        memberships: { select: { program: { select: { id: true, code: true, name: true } } } },
        studentProfile: {
          select: {
            studentCode: true,
            currentSemester: true,
            cohort: { select: { id: true, name: true } },
            program: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { supervisions: true } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export type UserListItem = Awaited<ReturnType<typeof listUsers>>["items"][number];
