import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import type { Actor } from "@/lib/permissions/rules";
import { recordAudit } from "@/modules/audit/audit-service";
import { notificationService } from "@/modules/notifications/notification-service";
import {
  getMonitoringRow,
  getMonitoringRows,
  type ThesisMonitoringRow,
} from "@/modules/monitoring/thesis-monitoring";

/**
 * Sincroniza las alertas persistidas de un trabajo con lo que dictan las reglas.
 *
 * El estado del semáforo siempre se deriva en vivo (§89); esta tabla existe
 * para conservar el histórico: cuándo se detectó, quién la gestionó y cuándo
 * dejó de aplicar. Por eso nada se borra: las que ya no aplican pasan a
 * RESOLVED con su fecha.
 */
export async function syncThesisAlerts(
  thesisId: string,
  options: { currentDate?: Date; row?: ThesisMonitoringRow } = {},
): Promise<{ created: number; resolved: number }> {
  // `row` permite reutilizar un cálculo ya hecho y evitar una consulta por
  // trabajo cuando se sincroniza un programa completo.
  const row = options.row ?? (await getMonitoringRow(thesisId, options));
  const evaluated = row.monitoring.alerts;

  const active = await prisma.alert.findMany({
    where: { thesisId, status: "ACTIVE" },
  });

  // Una alerta descartada por una persona no vuelve a levantarse dentro del
  // mismo periodo: "no aplica" es una decisión, no un estado transitorio.
  const dismissed = await prisma.alert.findMany({
    where: {
      thesisId,
      status: "DISMISSED",
      ...(row.period ? { detectedAt: { gte: row.period.startDate } } : {}),
    },
    select: { type: true },
  });
  const dismissedTypes = new Set(dismissed.map((a) => a.type));

  const evaluatedByType = new Map(evaluated.map((a) => [a.type, a]));
  const activeByType = new Map(active.map((a) => [a.type, a]));

  const toCreate = evaluated.filter(
    (a) => !activeByType.has(a.type) && !dismissedTypes.has(a.type),
  );
  const toResolve = active.filter((a) => !evaluatedByType.has(a.type));
  const toUpdate = evaluated.filter((a) => activeByType.has(a.type));

  await prisma.$transaction(async (tx) => {
    for (const alert of toCreate) {
      await tx.alert.create({
        data: {
          thesisId,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          metadata: alert.metadata as Prisma.InputJsonValue,
        },
      });
    }

    for (const alert of toUpdate) {
      const current = activeByType.get(alert.type)!;
      if (current.severity !== alert.severity || current.message !== alert.message) {
        // La gestión (managedAt / managementNote) se conserva: la condición
        // sigue siendo la misma, solo cambió su magnitud.
        await tx.alert.update({
          where: { id: current.id },
          data: {
            severity: alert.severity,
            message: alert.message,
            metadata: alert.metadata as Prisma.InputJsonValue,
          },
        });
      }
    }

    if (toResolve.length > 0) {
      await tx.alert.updateMany({
        where: { id: { in: toResolve.map((a) => a.id) } },
        // Sin resolvedById: la resolución fue automática, no de una persona.
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
    }
  });

  if (toCreate.length > 0) {
    const coordinators = await prisma.programMembership.findMany({
      where: { programId: row.programId, role: { in: ["COORDINADOR", "ADMIN"] } },
      select: { userId: true },
    });
    const recipients = [
      row.studentUserId,
      row.director?.userId,
      row.codirector?.userId,
      ...coordinators.map((c) => c.userId),
    ].filter((id): id is string => Boolean(id));
    await notificationService.notify({
      userIds: recipients,
      type: "ALERT_RAISED",
      title: "Nueva alerta de seguimiento",
      body: toCreate[0]!.message,
      link: `/trabajos/${thesisId}`,
    });
  }

  return { created: toCreate.length, resolved: toResolve.length };
}

/** Recalcula las alertas de todos los trabajos visibles para el actor. */
export async function syncAlertsForScope(
  where: Prisma.ThesisWhereInput,
  options: { currentDate?: Date } = {},
): Promise<{ theses: number; created: number; resolved: number }> {
  const rows = await getMonitoringRows({ ...where, status: "ACTIVE" }, options);
  let created = 0;
  let resolved = 0;
  for (const row of rows) {
    const result = await syncThesisAlerts(row.thesisId, { ...options, row });
    created += result.created;
    resolved += result.resolved;
  }
  return { theses: rows.length, created, resolved };
}

export async function listAlerts(
  thesisWhere: Prisma.ThesisWhereInput,
  filters: { status?: "ACTIVE" | "RESOLVED" | "DISMISSED"; severity?: "INFO" | "WARNING" | "CRITICAL" } = {},
) {
  return prisma.alert.findMany({
    where: {
      thesis: thesisWhere,
      status: filters.status ?? undefined,
      severity: filters.severity ?? undefined,
    },
    include: {
      thesis: {
        select: {
          id: true,
          title: true,
          student: { select: { studentCode: true, user: { select: { name: true } } } },
          supervisions: {
            where: { active: true, type: "DIRECTOR" },
            select: { user: { select: { name: true } } },
          },
        },
      },
      resolvedBy: { select: { name: true } },
      managedBy: { select: { name: true } },
    },
    // Sin gestionar primero: es lo que la coordinación necesita atender hoy.
    orderBy: [{ status: "asc" }, { managedAt: { sort: "asc", nulls: "first" } }, { severity: "desc" }, { detectedAt: "desc" }],
    take: 200,
  });
}

async function changeAlertStatus(
  actor: Actor,
  alertId: string,
  status: "RESOLVED" | "DISMISSED",
  note?: string,
) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { id: true, thesisId: true, status: true, metadata: true },
  });
  if (!alert) throw new NotFoundError("La alerta no existe.");

  const metadata = {
    ...((alert.metadata as Record<string, unknown> | null) ?? {}),
    ...(note ? { nota: note } : {}),
  };

  const updated = await prisma.alert.update({
    where: { id: alert.id },
    data: {
      status,
      resolvedAt: new Date(),
      resolvedById: actor.id,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: status === "RESOLVED" ? "ALERT_RESOLVED" : "ALERT_DISMISSED",
    entityType: "Alert",
    entityId: alert.id,
    metadata: { thesisId: alert.thesisId, nota: note ?? null },
  });

  return updated;
}

/**
 * Registra que una persona ya se ocupó de la alerta.
 *
 * La alerta NO se cierra: la condición que la originó sigue siendo cierta y
 * cerrarla haría que el siguiente recálculo la levantara de nuevo, perdiendo
 * la nota. Queda activa y marcada como "en seguimiento" hasta que el hecho
 * cambie, momento en el cual se resuelve sola.
 */
export async function manageAlert(actor: Actor, alertId: string, note: string) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { id: true, thesisId: true, status: true },
  });
  if (!alert) throw new NotFoundError("La alerta no existe.");

  const updated = await prisma.alert.update({
    where: { id: alert.id },
    data: {
      managedAt: new Date(),
      managedById: actor.id,
      managementNote: note.trim() || null,
    },
  });

  await recordAudit({
    userId: actor.id,
    action: "ALERT_MANAGED",
    entityType: "Alert",
    entityId: alert.id,
    metadata: { thesisId: alert.thesisId, nota: note || null },
  });

  return updated;
}

/** Descarta la alerta (no aplica al caso), conservando el registro. */
export async function dismissAlert(actor: Actor, alertId: string, note?: string) {
  return changeAlertStatus(actor, alertId, "DISMISSED", note);
}
