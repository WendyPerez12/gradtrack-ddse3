"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, toActionError, type ActionResult } from "@/lib/errors";
import { parseInput } from "@/lib/validations/parse";
import { requireAdvisoryConfirmation, requireAdvisoryManagement } from "@/lib/permissions/guards";
import {
  commitmentSchema,
  commitmentStatusSchema,
  completeAdvisorySchema,
  notCompletedSchema,
  rescheduleSchema,
  scheduleAdvisorySchema,
} from "@/lib/validations/advisory";
import {
  addCommitment,
  cancelAdvisory,
  completeAdvisory,
  markAdvisoryNotCompleted,
  rescheduleAdvisory,
  scheduleAdvisory,
  updateCommitmentStatus,
} from "@/modules/advisories/advisory-service";

async function thesisIdOfAdvisory(advisoryId: string): Promise<string> {
  const advisory = await prisma.advisory.findUnique({
    where: { id: advisoryId },
    select: { thesisId: true },
  });
  if (!advisory) throw new NotFoundError("La asesoría no existe.");
  return advisory.thesisId;
}

function revalidateThesis(thesisId: string) {
  revalidatePath(`/trabajos/${thesisId}`);
  revalidatePath("/trabajos");
  revalidatePath("/asesorias");
  revalidatePath("/alertas");
  revalidatePath("/panel");
}

export async function scheduleAdvisoryAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(scheduleAdvisorySchema, input);
    await requireAdvisoryManagement(actor, data.thesisId);
    await scheduleAdvisory(actor, data);
    revalidateThesis(data.thesisId);
    return { ok: true, data: undefined, message: "Asesoría programada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeAdvisoryAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(completeAdvisorySchema, input);
    const thesisId = await thesisIdOfAdvisory(data.advisoryId);
    await requireAdvisoryConfirmation(actor, thesisId);
    await completeAdvisory(actor, data);
    revalidateThesis(thesisId);
    return { ok: true, data: undefined, message: "Asesoría registrada como realizada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markNotCompletedAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(notCompletedSchema, input);
    const thesisId = await thesisIdOfAdvisory(data.advisoryId);
    await requireAdvisoryConfirmation(actor, thesisId);
    await markAdvisoryNotCompleted(actor, data);
    revalidateThesis(thesisId);
    return { ok: true, data: undefined, message: "Se registró que la asesoría no se realizó." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rescheduleAdvisoryAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(rescheduleSchema, input);
    const thesisId = await thesisIdOfAdvisory(data.advisoryId);
    await requireAdvisoryManagement(actor, thesisId);
    await rescheduleAdvisory(actor, data);
    revalidateThesis(thesisId);
    return { ok: true, data: undefined, message: "Asesoría reprogramada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelAdvisoryAction(input: {
  advisoryId: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const thesisId = await thesisIdOfAdvisory(input.advisoryId);
    await requireAdvisoryManagement(actor, thesisId);
    await cancelAdvisory(actor, input.advisoryId, input.reason);
    revalidateThesis(thesisId);
    return { ok: true, data: undefined, message: "Asesoría cancelada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addCommitmentAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(commitmentSchema, input);
    const thesisId = await thesisIdOfAdvisory(data.advisoryId);
    await requireAdvisoryManagement(actor, thesisId);
    await addCommitment(actor, {
      advisoryId: data.advisoryId,
      description: data.description,
      dueDate: data.dueDate || undefined,
      responsibleUserId: data.responsibleUserId || undefined,
    });
    revalidateThesis(thesisId);
    return { ok: true, data: undefined, message: "Compromiso registrado." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCommitmentStatusAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(commitmentStatusSchema, input);
    const commitment = await prisma.advisoryCommitment.findUnique({
      where: { id: data.commitmentId },
      select: { advisory: { select: { thesisId: true } } },
    });
    if (!commitment) throw new NotFoundError("El compromiso no existe.");
    await requireAdvisoryManagement(actor, commitment.advisory.thesisId);
    await updateCommitmentStatus(actor, data);
    revalidateThesis(commitment.advisory.thesisId);
    return { ok: true, data: undefined, message: "Compromiso actualizado." };
  } catch (error) {
    return toActionError(error);
  }
}
