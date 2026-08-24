import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Registra un evento de auditoría. Acepta un cliente de transacción para que
 * la traza se escriba de forma atómica junto con el cambio que la origina.
 * Nunca hace fallar la operación de negocio: si la auditoría falla se registra
 * en el log del servidor y la operación continúa.
 */
export async function recordAudit(entry: AuditEntry, db: Db = prisma): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    console.error("[gradtrack] no se pudo registrar auditoría:", error);
  }
}

/** Historial de un trabajo de grado, del evento más reciente al más antiguo. */
export async function getThesisAuditTrail(thesisId: string, relatedIds: string[] = []) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Thesis", entityId: thesisId },
        { entityType: "ThesisSupervision", entityId: { in: relatedIds } },
        { entityType: "Advisory", entityId: { in: relatedIds } },
        { entityType: "AdvisoryCommitment", entityId: { in: relatedIds } },
      ],
    },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
