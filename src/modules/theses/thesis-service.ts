import type { Prisma, SupervisionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/rules";
import { recordAudit } from "@/modules/audit/audit-service";
import { notificationService } from "@/modules/notifications/notification-service";
import type { AssignSupervisorInput, CreateThesisInput, UpdateThesisInput } from "@/lib/validations/thesis";

/**
 * Verifica que el docente pueda supervisar en el programa del trabajo.
 * Evita que una coordinación asigne docentes de otro programa (§93).
 */
async function assertTeacherBelongsToProgram(userId: string, programId: string) {
  const teacher = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, memberships: { select: { programId: true } } },
  });

  if (!teacher || !teacher.active) throw new NotFoundError("El docente no existe o está inactivo.");
  if (teacher.role === "ESTUDIANTE") {
    throw new ValidationError("Un estudiante no puede ser director ni codirector.");
  }
  const belongs = teacher.memberships.some((m) => m.programId === programId);
  if (!belongs && teacher.role !== "ADMIN") {
    throw new ValidationError("El docente no está vinculado a este programa académico.");
  }
}

/** Crea el trabajo de grado y, opcionalmente, asigna el equipo en el acto. */
export async function createThesis(actor: Actor, input: CreateThesisInput) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: input.studentProfileId },
    select: { id: true, programId: true, userId: true, active: true },
  });
  if (!student || !student.active) throw new NotFoundError("El estudiante no existe o está inactivo.");

  if (actor.role !== "ADMIN" && !actor.programIds.includes(student.programId)) {
    throw new ValidationError("El estudiante pertenece a un programa que no administras.");
  }

  const existing = await prisma.thesis.findFirst({
    where: { studentId: student.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("El estudiante ya tiene un trabajo de grado activo.");
  }

  if (input.directorUserId) await assertTeacherBelongsToProgram(input.directorUserId, student.programId);
  if (input.codirectorUserId) {
    if (input.codirectorUserId === input.directorUserId) {
      throw new ValidationError("El codirector debe ser una persona distinta del director.");
    }
    await assertTeacherBelongsToProgram(input.codirectorUserId, student.programId);
  }

  const thesis = await prisma.$transaction(async (tx) => {
    const created = await tx.thesis.create({
      data: {
        studentId: student.id,
        programId: student.programId,
        title: input.title,
        description: input.description || null,
        assignedAt: input.directorUserId ? new Date() : null,
      },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: "THESIS_CREATED",
        entityType: "Thesis",
        entityId: created.id,
        metadata: { title: created.title, studentProfileId: student.id },
      },
      tx,
    );

    for (const [userId, type] of [
      [input.directorUserId, "DIRECTOR"],
      [input.codirectorUserId, "CODIRECTOR"],
    ] as const) {
      if (!userId) continue;
      const supervision = await tx.thesisSupervision.create({
        data: { thesisId: created.id, userId, type: type as SupervisionType, assignedById: actor.id },
      });
      await recordAudit(
        {
          userId: actor.id,
          action: type === "DIRECTOR" ? "DIRECTOR_ASSIGNED" : "CODIRECTOR_ASSIGNED",
          entityType: "ThesisSupervision",
          entityId: supervision.id,
          metadata: { thesisId: created.id, supervisorUserId: userId },
        },
        tx,
      );
      await notificationService.notify(
        {
          userIds: [userId, student.userId],
          type: "SUPERVISION_ASSIGNED",
          title: type === "DIRECTOR" ? "Nuevo trabajo dirigido" : "Nueva codirección asignada",
          body: created.title,
          link: `/trabajos/${created.id}`,
        },
        tx,
      );
    }

    return created;
  });

  return thesis;
}

export async function updateThesis(actor: Actor, input: UpdateThesisInput) {
  const thesis = await prisma.thesis.update({
    where: { id: input.thesisId },
    data: {
      title: input.title,
      description: input.description || null,
      status: input.status,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "THESIS_UPDATED",
    entityType: "Thesis",
    entityId: thesis.id,
    metadata: { title: thesis.title, status: thesis.status },
  });

  return thesis;
}

/**
 * Asigna director o codirector conservando el histórico (§19, §72, CA-08).
 * Cierra la asignación vigente y crea una nueva dentro de la misma transacción,
 * junto con su registro de auditoría.
 */
export async function assignSupervisor(actor: Actor, input: AssignSupervisorInput) {
  const thesis = await prisma.thesis.findUnique({
    where: { id: input.thesisId },
    select: {
      id: true,
      programId: true,
      assignedAt: true,
      title: true,
      student: { select: { userId: true } },
      supervisions: { where: { active: true }, select: { id: true, userId: true, type: true } },
    },
  });
  if (!thesis) throw new NotFoundError("El trabajo de grado no existe.");

  await assertTeacherBelongsToProgram(input.userId, thesis.programId);

  const current = thesis.supervisions.find((s) => s.type === input.type) ?? null;
  if (current?.userId === input.userId) {
    throw new ConflictError("Ese docente ya ocupa ese rol en el trabajo.");
  }

  const other = thesis.supervisions.find((s) => s.type !== input.type) ?? null;
  if (other?.userId === input.userId) {
    throw new ValidationError("El director y el codirector deben ser personas distintas.");
  }

  return prisma.$transaction(async (tx) => {
    if (current) {
      await tx.thesisSupervision.update({
        where: { id: current.id },
        data: { active: false, endedAt: new Date() },
      });
    }

    const supervision = await tx.thesisSupervision.create({
      data: {
        thesisId: thesis.id,
        userId: input.userId,
        type: input.type,
        assignedById: actor.id,
      },
    });

    // El seguimiento arranca cuando el trabajo recibe su primer director.
    if (input.type === "DIRECTOR" && !thesis.assignedAt) {
      await tx.thesis.update({ where: { id: thesis.id }, data: { assignedAt: new Date() } });
    }

    const action =
      input.type === "DIRECTOR"
        ? current
          ? "DIRECTOR_CHANGED"
          : "DIRECTOR_ASSIGNED"
        : "CODIRECTOR_ASSIGNED";

    await recordAudit(
      {
        userId: actor.id,
        action,
        entityType: "ThesisSupervision",
        entityId: supervision.id,
        metadata: {
          thesisId: thesis.id,
          previousUserId: current?.userId ?? null,
          newUserId: input.userId,
          reason: input.reason || null,
        },
      },
      tx,
    );

    await notificationService.notify(
      {
        userIds: [input.userId, thesis.student.userId, ...(current ? [current.userId] : [])],
        type: "SUPERVISION_ASSIGNED",
        title: input.type === "DIRECTOR" ? "Dirección actualizada" : "Codirección actualizada",
        body: thesis.title,
        link: `/trabajos/${thesis.id}`,
      },
      tx,
    );

    return supervision;
  });
}

/** Retira un codirector conservando el registro histórico. */
export async function removeSupervisor(
  actor: Actor,
  input: { thesisId: string; supervisionId: string; reason?: string },
) {
  const supervision = await prisma.thesisSupervision.findUnique({
    where: { id: input.supervisionId },
    select: { id: true, thesisId: true, type: true, userId: true, active: true },
  });
  if (!supervision || supervision.thesisId !== input.thesisId) {
    throw new NotFoundError("La asignación no existe.");
  }
  if (!supervision.active) throw new ConflictError("Esa asignación ya está cerrada.");
  if (supervision.type === "DIRECTOR") {
    throw new ValidationError(
      "Un trabajo no puede quedarse sin director: asigna un reemplazo en lugar de retirarlo.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.thesisSupervision.update({
      where: { id: supervision.id },
      data: { active: false, endedAt: new Date() },
    });
    await recordAudit(
      {
        userId: actor.id,
        action: "CODIRECTOR_REMOVED",
        entityType: "ThesisSupervision",
        entityId: supervision.id,
        metadata: { thesisId: input.thesisId, reason: input.reason || null },
      },
      tx,
    );
  });
}

/** Detalle completo del trabajo para la página `/trabajos/[id]`. */
export async function getThesisDetail(thesisId: string) {
  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    include: {
      program: { select: { id: true, name: true, code: true } },
      student: {
        select: {
          id: true,
          studentCode: true,
          currentSemester: true,
          userId: true,
          user: { select: { name: true, email: true } },
          cohort: { select: { name: true } },
        },
      },
      supervisions: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ active: "desc" }, { startedAt: "desc" }],
      },
      advisories: {
        include: {
          createdBy: { select: { name: true } },
          confirmedBy: { select: { name: true } },
          attendances: { include: { user: { select: { name: true } } } },
          commitments: {
            include: { responsible: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
          period: { select: { id: true, name: true } },
        },
        orderBy: { scheduledDate: "desc" },
      },
      alerts: { orderBy: [{ status: "asc" }, { detectedAt: "desc" }] },
    },
  });

  if (!thesis) throw new NotFoundError("El trabajo de grado no existe.");
  return thesis;
}

export type ThesisDetail = Awaited<ReturnType<typeof getThesisDetail>>;
