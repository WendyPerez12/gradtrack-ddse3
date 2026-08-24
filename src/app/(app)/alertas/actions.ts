"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ForbiddenError, NotFoundError, toActionError, type ActionResult } from "@/lib/errors";
import { requireAlertManagement, thesisScopeWhere } from "@/lib/permissions/guards";
import { dismissAlert, manageAlert, syncAlertsForScope } from "@/modules/alerts/alert-service";

async function requireAlertAccess(alertId: string) {
  const actor = await requireActor();
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { thesisId: true },
  });
  if (!alert) throw new NotFoundError("La alerta no existe.");
  // Gestionar o descartar es escritura: no basta con poder ver el trabajo.
  await requireAlertManagement(actor, alert.thesisId);
  return { actor, thesisId: alert.thesisId };
}

/**
 * Deja constancia de la gestión sin cerrar la alerta: sigue activa mientras la
 * condición siga siendo cierta, y se resuelve sola cuando deje de serlo.
 */
export async function manageAlertAction(input: {
  alertId: string;
  note: string;
}): Promise<ActionResult> {
  try {
    const { actor, thesisId } = await requireAlertAccess(input.alertId);
    await manageAlert(actor, input.alertId, input.note);
    revalidatePath("/alertas");
    revalidatePath(`/trabajos/${thesisId}`);
    return {
      ok: true,
      data: undefined,
      message: "Gestión registrada. La alerta seguirá visible hasta que la situación cambie.",
    };
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
    if (actor.role === "ESTUDIANTE") {
      throw new ForbiddenError("El recálculo de alertas lo hace la coordinación o la dirección.");
    }
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
