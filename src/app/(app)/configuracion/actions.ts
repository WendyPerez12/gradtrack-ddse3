"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ConflictError, ForbiddenError, toActionError, ValidationError, type ActionResult } from "@/lib/errors";
import { canUserEditProgramSettings } from "@/lib/permissions/rules";
import { parseInput } from "@/lib/validations/parse";
import { recordAudit } from "@/modules/audit/audit-service";

const settingsSchema = z.object({
  programId: z.string().min(1),
  minimumAdvisoriesPerPeriod: z.coerce.number().int().min(1, "Mínimo 1").max(20),
  warningDaysWithoutAdvisory: z.coerce.number().int().min(1).max(365),
  criticalDaysWithoutAdvisory: z.coerce.number().int().min(1).max(365),
  riskWindowDaysBeforeDeadline: z.coerce.number().int().min(0).max(365),
  missedAdvisoryGraceDays: z.coerce.number().int().min(0).max(90),
  requireNextAdvisoryDate: z.boolean(),
  alertsEnabled: z.boolean(),
});

/** Actualiza los umbrales del programa (§25, CA-09: sin tocar código). */
export async function updateProgramSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(settingsSchema, input);

    if (!canUserEditProgramSettings(actor, data.programId)) {
      throw new ForbiddenError("No administras este programa académico.");
    }
    if (data.criticalDaysWithoutAdvisory <= data.warningDaysWithoutAdvisory) {
      throw new ValidationError("El umbral crítico debe ser mayor que el de advertencia.", {
        criticalDaysWithoutAdvisory: ["Debe ser mayor que el umbral de advertencia."],
      });
    }

    const { programId, ...values } = data;
    await prisma.programSettings.upsert({
      where: { programId },
      create: { programId, ...values },
      update: values,
    });

    await recordAudit({
      userId: actor.id,
      action: "SETTINGS_CHANGED",
      entityType: "ProgramSettings",
      entityId: programId,
      metadata: values,
    });

    revalidatePath("/configuracion");
    revalidatePath("/panel");
    revalidatePath("/alertas");
    return { ok: true, data: undefined, message: "Configuración actualizada." };
  } catch (error) {
    return toActionError(error);
  }
}

const periodSchema = z.object({ periodId: z.string().min(1), programId: z.string().min(1) });

/** Activa un periodo académico; solo puede haber uno activo por programa. */
export async function activatePeriodAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(periodSchema, input);
    if (!canUserEditProgramSettings(actor, data.programId)) {
      throw new ForbiddenError("No administras este programa académico.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.academicPeriod.updateMany({
        where: { programId: data.programId, active: true },
        data: { active: false, status: "CLOSED" },
      });
      await tx.academicPeriod.update({
        where: { id: data.periodId },
        data: { active: true, status: "ACTIVE" },
      });
      await recordAudit(
        {
          userId: actor.id,
          action: "SETTINGS_CHANGED",
          entityType: "AcademicPeriod",
          entityId: data.periodId,
          metadata: { programId: data.programId, activated: true },
        },
        tx,
      );
    });

    revalidatePath("/configuracion");
    revalidatePath("/panel");
    return { ok: true, data: undefined, message: "Periodo activado." };
  } catch (error) {
    return toActionError(error);
  }
}

const createPeriodSchema = z.object({
  programId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(4, "Usa un nombre como 2027-1")
    .max(20, "El nombre es demasiado largo"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  advisoryDeadline: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"), z.literal("")])
    .optional(),
  activate: z.boolean().default(false),
});

/**
 * Crea el siguiente periodo académico. Sin esto el sistema se detendría al
 * cerrar el semestre: las asesorías nuevas no tendrían periodo al que contar.
 */
export async function createPeriodAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(createPeriodSchema, input);

    if (!canUserEditProgramSettings(actor, data.programId)) {
      throw new ForbiddenError("No administras este programa académico.");
    }

    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${data.endDate}T00:00:00.000Z`);
    const deadline = data.advisoryDeadline
      ? new Date(`${data.advisoryDeadline}T00:00:00.000Z`)
      : null;

    if (endDate <= startDate) {
      throw new ValidationError("El periodo debe terminar después de su fecha de inicio.", {
        endDate: ["Debe ser posterior a la fecha de inicio."],
      });
    }
    if (deadline && (deadline < startDate || deadline > endDate)) {
      throw new ValidationError("La fecha límite debe caer dentro del periodo.", {
        advisoryDeadline: ["Debe estar entre el inicio y el fin del periodo."],
      });
    }

    const duplicated = await prisma.academicPeriod.findFirst({
      where: { programId: data.programId, name: data.name },
      select: { id: true },
    });
    if (duplicated) {
      throw new ConflictError(`El programa ya tiene un periodo llamado ${data.name}.`);
    }

    await prisma.$transaction(async (tx) => {
      if (data.activate) {
        await tx.academicPeriod.updateMany({
          where: { programId: data.programId, active: true },
          data: { active: false, status: "CLOSED" },
        });
      }
      const period = await tx.academicPeriod.create({
        data: {
          programId: data.programId,
          name: data.name,
          startDate,
          endDate,
          advisoryDeadline: deadline,
          active: data.activate,
          status: data.activate ? "ACTIVE" : "PLANNED",
        },
      });
      await recordAudit(
        {
          userId: actor.id,
          action: "SETTINGS_CHANGED",
          entityType: "AcademicPeriod",
          entityId: period.id,
          metadata: { programId: data.programId, name: data.name, created: true },
        },
        tx,
      );
    });

    revalidatePath("/configuracion");
    revalidatePath("/panel");
    return {
      ok: true,
      data: undefined,
      message: data.activate ? `Periodo ${data.name} creado y activado.` : `Periodo ${data.name} creado.`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
