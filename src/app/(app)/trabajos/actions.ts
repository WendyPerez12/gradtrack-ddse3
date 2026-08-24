"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toActionError, ValidationError, type ActionResult } from "@/lib/errors";
import { parseInput } from "@/lib/validations/parse";
import { requireAssignmentManagement, requireThesisAccess } from "@/lib/permissions/guards";
import { canUserManageThesisAssignment } from "@/lib/permissions/rules";
import {
  assignSupervisorSchema,
  createThesisSchema,
  removeSupervisorSchema,
  updateThesisSchema,
} from "@/lib/validations/thesis";
import { syncThesisAlerts } from "@/modules/alerts/alert-service";
import {
  assignSupervisor,
  createThesis,
  removeSupervisor,
  updateThesis,
} from "@/modules/theses/thesis-service";

export async function createThesisAction(input: unknown): Promise<ActionResult<{ thesisId: string }>> {
  try {
    const actor = await requireActor();
    const data = parseInput(createThesisSchema, input);

    const student = await prisma.studentProfile.findUnique({
      where: { id: data.studentProfileId },
      select: { programId: true },
    });
    if (!student) throw new ValidationError("El estudiante seleccionado no existe.");
    await requireAssignmentManagement(actor, student.programId);

    const thesis = await createThesis(actor, data);
    await syncThesisAlerts(thesis.id);

    revalidatePath("/trabajos");
    revalidatePath("/panel");
    return { ok: true, data: { thesisId: thesis.id }, message: "Trabajo de grado creado." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateThesisAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(updateThesisSchema, input);
    const context = await requireThesisAccess(actor, data.thesisId);
    await requireAssignmentManagement(actor, context.programId);

    await updateThesis(actor, data);
    await syncThesisAlerts(data.thesisId);

    revalidatePath(`/trabajos/${data.thesisId}`);
    revalidatePath("/trabajos");
    return { ok: true, data: undefined, message: "Trabajo actualizado." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function assignSupervisorAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(assignSupervisorSchema, input);
    const context = await requireThesisAccess(actor, data.thesisId);
    if (!canUserManageThesisAssignment(actor, context.programId)) {
      throw new ValidationError("Solo la coordinación del programa asigna director o codirector.");
    }

    await assignSupervisor(actor, data);
    await syncThesisAlerts(data.thesisId);

    revalidatePath(`/trabajos/${data.thesisId}`);
    revalidatePath("/trabajos");
    revalidatePath("/panel");
    return {
      ok: true,
      data: undefined,
      message: data.type === "DIRECTOR" ? "Director asignado." : "Codirector asignado.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeSupervisorAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(removeSupervisorSchema, input);
    const context = await requireThesisAccess(actor, data.thesisId);
    await requireAssignmentManagement(actor, context.programId);

    await removeSupervisor(actor, data);

    revalidatePath(`/trabajos/${data.thesisId}`);
    return { ok: true, data: undefined, message: "Codirector retirado." };
  } catch (error) {
    return toActionError(error);
  }
}
