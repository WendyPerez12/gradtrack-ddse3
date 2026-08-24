"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, toActionError, ValidationError, type ActionResult } from "@/lib/errors";
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
