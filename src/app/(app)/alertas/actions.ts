"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError, toActionError, type ActionResult } from "@/lib/errors";
import { requireThesisAccess, thesisScopeWhere } from "@/lib/permissions/guards";
import { dismissAlert, resolveAlert, syncAlertsForScope } from "@/modules/alerts/alert-service";

async function requireAlertAccess(alertId: string) {
  const actor = await requireActor();
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { thesisId: true },
  });
  if (!alert) throw new NotFoundError("La alerta no existe.");
  await requireThesisAccess(actor, alert.thesisId);
  return { actor, thesisId: alert.thesisId };
}

export async function resolveAlertAction(input: {
  alertId: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const { actor, thesisId } = await requireAlertAccess(input.alertId);
    await resolveAlert(actor, input.alertId, input.note);
    revalidatePath("/alertas");
    revalidatePath(`/trabajos/${thesisId}`);
    return { ok: true, data: undefined, message: "Alerta marcada como gestionada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function dismissAlertAction(input: {
  alertId: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const { actor, thesisId } = await requireAlertAccess(input.alertId);
    await dismissAlert(actor, input.alertId, input.note);
    revalidatePath("/alertas");
    revalidatePath(`/trabajos/${thesisId}`);
    return { ok: true, data: undefined, message: "Alerta descartada." };
  } catch (error) {
    return toActionError(error);
  }
}

/** Recalcula las alertas de todos los trabajos visibles para el usuario. */
export async function recalculateAlertsAction(): Promise<ActionResult<{ theses: number }>> {
  try {
    const actor = await requireActor();
    const result = await syncAlertsForScope(thesisScopeWhere(actor));
    revalidatePath("/alertas");
    revalidatePath("/panel");
    return {
      ok: true,
      data: { theses: result.theses },
      message: `Se revisaron ${result.theses} trabajos: ${result.created} alertas nuevas y ${result.resolved} resueltas.`,
    };
  } catch (error) {
    return toActionError(error);
  }
}
