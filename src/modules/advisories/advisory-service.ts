import type { MeetingRole, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseDayInput } from "@/lib/dates";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/rules";
import { recordAudit } from "@/modules/audit/audit-service";
import { notificationService } from "@/modules/notifications/notification-service";
import { getProgramSettings, requireActivePeriod } from "@/modules/programs/program-service";
import { syncThesisAlerts } from "@/modules/alerts/alert-service";
import type {
  CompleteAdvisoryInput,
  NotCompletedInput,
  ScheduleAdvisoryInput,
} from "@/lib/validations/advisory";

/** Periodo académico al que pertenece una fecha; si ninguno la contiene, el activo. */
async function resolvePeriodForDate(programId: string, date: Date) {
  const containing = await prisma.academicPeriod.findFirst({
    where: { programId, startDate: { lte: date }, endDate: { gte: date } },
    orderBy: { startDate: "desc" },
  });
  return containing ?? (await requireActivePeriod(programId));
}

async function loadThesisContext(thesisId: string) {
  const thesis = await prisma.thesis.findUnique({
    where: { id: thesisId },
    select: {
      id: true,
      title: true,
      programId: true,
      status: true,
      student: { select: { userId: true } },
      supervisions: { where: { active: true }, select: { userId: true, type: true } },
    },
  });
  if (!thesis) throw new NotFoundError("El trabajo de grado no existe.");
  return thesis;
}

/** Programa una asesoría (§40). Queda en estado SCHEDULED y no cuenta aún. */
export async function scheduleAdvisory(actor: Actor, input: ScheduleAdvisoryInput) {
  const thesis = await loadThesisContext(input.thesisId);
  if (thesis.status !== "ACTIVE") {
    throw new ConflictError("Solo se pueden programar asesorías de trabajos activos.");
  }
  const hasDirector = thesis.supervisions.some((s) => s.type === "DIRECTOR");
  if (!hasDirector) {
    throw new ValidationError("El trabajo debe tener un director asignado antes de programar asesorías.");
  }

  const scheduledDate = parseDayInput(input.scheduledDate);
  const period = await resolvePeriodForDate(thesis.programId, scheduledDate);

  const duplicated = await prisma.advisory.findFirst({
    where: { thesisId: thesis.id, scheduledDate, status: "SCHEDULED" },
    select: { id: true },
  });
  if (duplicated) {
    throw new ConflictError("Ya existe una asesoría programada para esa fecha.");
  }

  const advisory = await prisma.$transaction(async (tx) => {
    const created = await tx.advisory.create({
      data: {
        thesisId: thesis.id,
        periodId: period.id,
        scheduledDate,
        scheduledTime: input.scheduledTime || null,
        mode: input.mode,
        topic: input.topic,
        observations: input.observations || null,
        status: "SCHEDULED",
        createdById: actor.id,
      },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: "ADVISORY_CREATED",
        entityType: "Advisory",
        entityId: created.id,
        metadata: { thesisId: thesis.id, scheduledDate: input.scheduledDate },
      },
      tx,
    );

    await notificationService.notify(
      {
        userIds: [thesis.student.userId, ...thesis.supervisions.map((s) => s.userId)],
        type: "ADVISORY_SCHEDULED",
        title: "Nueva asesoría programada",
        body: `${thesis.title} — ${input.scheduledDate}`,
        link: `/trabajos/${thesis.id}`,
      },
      tx,
    );

    return created;
  });

  await syncThesisAlerts(thesis.id);
  return advisory;
}

/**
 * Confirma que la asesoría se realizó (§41). Solo desde aquí una asesoría
 * empieza a contar para el mínimo del periodo.
 */
export async function completeAdvisory(actor: Actor, input: CompleteAdvisoryInput) {
  const advisory = await prisma.advisory.findUnique({
    where: { id: input.advisoryId },
    select: { id: true, thesisId: true, status: true, periodId: true },
  });
  if (!advisory) throw new NotFoundError("La asesoría no existe.");
  if (advisory.status === "COMPLETED") {
    throw new ConflictError("Esta asesoría ya fue confirmada.");
  }
  if (advisory.status === "CANCELLED") {
    throw new ConflictError("Una asesoría cancelada no puede marcarse como realizada.");
  }

  const thesis = await loadThesisContext(advisory.thesisId);
  const settings = await getProgramSettings(thesis.programId);

  if (settings.requireNextAdvisoryDate && !input.nextAdvisoryDate) {
    throw new ValidationError("El programa exige acordar la fecha de la próxima asesoría.", {
      nextAdvisoryDate: ["Acuerda la próxima fecha para cerrar la asesoría."],
    });
  }

  const actualDate = parseDayInput(input.actualDate);
  const nextDate = input.nextAdvisoryDate ? parseDayInput(input.nextAdvisoryDate) : null;
  if (nextDate && nextDate <= actualDate) {
    throw new ValidationError("La próxima asesoría debe ser posterior a la fecha de esta sesión.", {
      nextAdvisoryDate: ["Debe ser posterior a la fecha de la asesoría."],
    });
  }

  const director = thesis.supervisions.find((s) => s.type === "DIRECTOR");
  const codirector = thesis.supervisions.find((s) => s.type === "CODIRECTOR");

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.advisory.update({
      where: { id: advisory.id },
      data: {
        status: "COMPLETED",
        actualDate,
        mode: input.mode,
        topic: input.topic,
        summary: input.summary || null,
        observations: input.observations || null,
        nextAdvisoryDate: nextDate,
        confirmedById: actor.id,
        confirmedAt: new Date(),
      },
    });

    // Asistencia: se reemplaza el registro previo de cada participante.
    const attendance: Array<{ userId: string; roleAtMeeting: MeetingRole; attended: boolean }> = [
      { userId: thesis.student.userId, roleAtMeeting: "STUDENT", attended: input.studentAttended },
    ];
    if (director) {
      attendance.push({ userId: director.userId, roleAtMeeting: "DIRECTOR", attended: input.directorAttended });
    }
    if (codirector && input.codirectorAttended !== undefined) {
      attendance.push({
        userId: codirector.userId,
        roleAtMeeting: "CODIRECTOR",
        attended: input.codirectorAttended,
      });
    }

    for (const row of attendance) {
      await tx.advisoryAttendance.upsert({
        where: { advisoryId_userId: { advisoryId: advisory.id, userId: row.userId } },
        create: { advisoryId: advisory.id, ...row },
        update: { attended: row.attended, roleAtMeeting: row.roleAtMeeting },
      });
    }

    for (const commitment of input.commitments) {
      if (!commitment.description.trim()) continue;
      const created = await tx.advisoryCommitment.create({
        data: {
          advisoryId: advisory.id,
          description: commitment.description,
          dueDate: commitment.dueDate ? parseDayInput(commitment.dueDate) : null,
          responsibleUserId: thesis.student.userId,
        },
      });
      await recordAudit(
        {
          userId: actor.id,
          action: "COMMITMENT_CREATED",
          entityType: "AdvisoryCommitment",
          entityId: created.id,
          metadata: { advisoryId: advisory.id, thesisId: thesis.id },
        },
        tx,
      );
    }

    let nextAdvisoryId: string | null = null;
    if (input.createNextAdvisory && nextDate) {
      const period = await resolvePeriodForDate(thesis.programId, nextDate);
      const exists = await tx.advisory.findFirst({
        where: { thesisId: thesis.id, scheduledDate: nextDate, status: "SCHEDULED" },
        select: { id: true },
      });
      if (!exists) {
        const next = await tx.advisory.create({
          data: {
            thesisId: thesis.id,
            periodId: period.id,
            scheduledDate: nextDate,
            mode: input.mode,
            topic: input.nextAdvisoryTopic || "Seguimiento del trabajo de grado",
            status: "SCHEDULED",
            createdById: actor.id,
          },
        });
        nextAdvisoryId = next.id;
        await recordAudit(
          {
            userId: actor.id,
            action: "ADVISORY_CREATED",
            entityType: "Advisory",
            entityId: next.id,
            metadata: { thesisId: thesis.id, origin: advisory.id },
          },
          tx,
        );
      }
    }

    await recordAudit(
      {
        userId: actor.id,
        action: "ADVISORY_COMPLETED",
        entityType: "Advisory",
        entityId: advisory.id,
        metadata: {
          thesisId: thesis.id,
          actualDate: input.actualDate,
          commitments: input.commitments.length,
          nextAdvisoryDate: input.nextAdvisoryDate || null,
        },
      },
      tx,
    );

    await notificationService.notify(
      {
        userIds: [thesis.student.userId, ...thesis.supervisions.map((s) => s.userId)],
        type: "ADVISORY_COMPLETED",
        title: "Asesoría registrada",
        body: `${thesis.title} — ${input.topic}`,
        link: `/trabajos/${thesis.id}`,
      },
      tx,
    );

    return { advisory: updated, nextAdvisoryId };
  });

  await syncThesisAlerts(thesis.id);
  return result;
}

/** Marca la asesoría como no realizada, con motivo y reprogramación opcional (§42). */
export async function markAdvisoryNotCompleted(actor: Actor, input: NotCompletedInput) {
  const advisory = await prisma.advisory.findUnique({
    where: { id: input.advisoryId },
    select: { id: true, thesisId: true, status: true, mode: true, topic: true },
  });
  if (!advisory) throw new NotFoundError("La asesoría no existe.");
  if (advisory.status === "COMPLETED") {
    throw new ConflictError("La asesoría ya fue confirmada como realizada.");
  }

  const thesis = await loadThesisContext(advisory.thesisId);

  await prisma.$transaction(async (tx) => {
    await tx.advisory.update({
      where: { id: advisory.id },
      data: {
        status: "NOT_COMPLETED",
        notCompletedReason: input.reason,
        observations: input.observations || null,
        confirmedById: actor.id,
        confirmedAt: new Date(),
      },
    });

    if (input.rescheduleDate) {
      const newDate = parseDayInput(input.rescheduleDate);
      const period = await resolvePeriodForDate(thesis.programId, newDate);
      const created = await tx.advisory.create({
        data: {
          thesisId: thesis.id,
          periodId: period.id,
          scheduledDate: newDate,
          mode: advisory.mode,
          topic: advisory.topic,
          status: "SCHEDULED",
          createdById: actor.id,
        },
      });
      await recordAudit(
        {
          userId: actor.id,
          action: "ADVISORY_CREATED",
          entityType: "Advisory",
          entityId: created.id,
          metadata: { thesisId: thesis.id, rescheduledFrom: advisory.id },
        },
        tx,
      );
      await notificationService.notify(
        {
          userIds: [thesis.student.userId, ...thesis.supervisions.map((s) => s.userId)],
          type: "ADVISORY_RESCHEDULED",
          title: "Asesoría reprogramada",
          body: `${thesis.title} — nueva fecha ${input.rescheduleDate}`,
          link: `/trabajos/${thesis.id}`,
        },
        tx,
      );
    }

    await recordAudit(
      {
        userId: actor.id,
        action: "ADVISORY_NOT_COMPLETED",
        entityType: "Advisory",
        entityId: advisory.id,
        metadata: { thesisId: thesis.id, reason: input.reason },
      },
      tx,
    );
  });

  await syncThesisAlerts(thesis.id);
}

/** Cambia la fecha de una asesoría todavía no realizada. */
export async function rescheduleAdvisory(
  actor: Actor,
  input: { advisoryId: string; newDate: string; newTime?: string; reason?: string },
) {
  const advisory = await prisma.advisory.findUnique({
    where: { id: input.advisoryId },
    select: { id: true, thesisId: true, status: true, mode: true, topic: true },
  });
  if (!advisory) throw new NotFoundError("La asesoría no existe.");
  if (advisory.status !== "SCHEDULED") {
    throw new ConflictError("Solo se pueden reprogramar asesorías en estado programada.");
  }

  const thesis = await loadThesisContext(advisory.thesisId);
  const newDate = parseDayInput(input.newDate);
  const period = await resolvePeriodForDate(thesis.programId, newDate);

  const created = await prisma.$transaction(async (tx) => {
    await tx.advisory.update({
      where: { id: advisory.id },
      data: { status: "RESCHEDULED", confirmedById: actor.id, confirmedAt: new Date() },
    });
    const next = await tx.advisory.create({
      data: {
        thesisId: thesis.id,
        periodId: period.id,
        scheduledDate: newDate,
        scheduledTime: input.newTime || null,
        mode: advisory.mode,
        topic: advisory.topic,
        status: "SCHEDULED",
        createdById: actor.id,
      },
    });
    await recordAudit(
      {
        userId: actor.id,
        action: "ADVISORY_UPDATED",
        entityType: "Advisory",
        entityId: advisory.id,
        metadata: { thesisId: thesis.id, rescheduledTo: next.id, reason: input.reason || null },
      },
      tx,
    );
    await notificationService.notify(
      {
        userIds: [thesis.student.userId, ...thesis.supervisions.map((s) => s.userId)],
        type: "ADVISORY_RESCHEDULED",
        title: "Asesoría reprogramada",
        body: `${thesis.title} — nueva fecha ${input.newDate}`,
        link: `/trabajos/${thesis.id}`,
      },
      tx,
    );
    return next;
  });

  await syncThesisAlerts(thesis.id);
  return created;
}

export async function cancelAdvisory(actor: Actor, advisoryId: string, reason?: string) {
  const advisory = await prisma.advisory.findUnique({
    where: { id: advisoryId },
    select: { id: true, thesisId: true, status: true },
  });
  if (!advisory) throw new NotFoundError("La asesoría no existe.");
  if (advisory.status === "COMPLETED") {
    throw new ConflictError("Una asesoría realizada no se puede cancelar; conserva el histórico.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.advisory.update({ where: { id: advisory.id }, data: { status: "CANCELLED" } });
    await recordAudit(
      {
        userId: actor.id,
        action: "ADVISORY_CANCELLED",
        entityType: "Advisory",
        entityId: advisory.id,
        metadata: { thesisId: advisory.thesisId, reason: reason || null },
      },
      tx,
    );
  });

  await syncThesisAlerts(advisory.thesisId);
}

/** Agrega un compromiso a una asesoría ya registrada (§23). */
export async function addCommitment(
  actor: Actor,
  input: { advisoryId: string; description: string; dueDate?: string; responsibleUserId?: string },
) {
  const advisory = await prisma.advisory.findUnique({
    where: { id: input.advisoryId },
    select: { id: true, thesisId: true, thesis: { select: { student: { select: { userId: true } } } } },
  });
  if (!advisory) throw new NotFoundError("La asesoría no existe.");

  const commitment = await prisma.advisoryCommitment.create({
    data: {
      advisoryId: advisory.id,
      description: input.description,
      dueDate: input.dueDate ? parseDayInput(input.dueDate) : null,
      responsibleUserId: input.responsibleUserId || advisory.thesis.student.userId,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "COMMITMENT_CREATED",
    entityType: "AdvisoryCommitment",
    entityId: commitment.id,
    metadata: { advisoryId: advisory.id, thesisId: advisory.thesisId },
  });

  await notificationService.notify({
    userIds: [advisory.thesis.student.userId],
    type: "COMMITMENT_CREATED",
    title: "Nuevo compromiso registrado",
    body: input.description,
    link: `/trabajos/${advisory.thesisId}`,
  });

  return commitment;
}

export async function updateCommitmentStatus(
  actor: Actor,
  input: { commitmentId: string; status: "PENDING" | "COMPLETED" | "CANCELLED" },
) {
  const commitment = await prisma.advisoryCommitment.findUnique({
    where: { id: input.commitmentId },
    select: { id: true, advisory: { select: { thesisId: true } } },
  });
  if (!commitment) throw new NotFoundError("El compromiso no existe.");

  const updated = await prisma.advisoryCommitment.update({
    where: { id: commitment.id },
    data: {
      status: input.status,
      completedAt: input.status === "COMPLETED" ? new Date() : null,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "COMMITMENT_COMPLETED",
    entityType: "AdvisoryCommitment",
    entityId: commitment.id,
    metadata: { thesisId: commitment.advisory.thesisId, status: input.status },
  });

  return updated;
}

/** Asesorías visibles para el actor, con filtros y paginación. */
export async function listAdvisories(
  where: Prisma.AdvisoryWhereInput,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, options.pageSize ?? 20);

  const [items, total] = await Promise.all([
    prisma.advisory.findMany({
      where,
      include: {
        thesis: {
          select: {
            id: true,
            title: true,
            student: { select: { user: { select: { name: true } }, studentCode: true } },
            supervisions: {
              where: { active: true, type: "DIRECTOR" },
              select: { user: { select: { name: true } } },
            },
          },
        },
        period: { select: { name: true } },
      },
      orderBy: [{ scheduledDate: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.advisory.count({ where }),
  ]);

  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
