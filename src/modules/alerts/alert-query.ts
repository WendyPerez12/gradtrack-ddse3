import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { AlertSummaryItem } from "@/components/dashboard/alert-summary-panel";

/** Alertas activas del alcance indicado, listas para el panel. */
export async function getActiveAlertSummaries(
  thesisWhere: Prisma.ThesisWhereInput,
): Promise<AlertSummaryItem[]> {
  const alerts = await prisma.alert.findMany({
    where: { status: "ACTIVE", thesis: thesisWhere },
    include: {
      thesis: {
        select: {
          id: true,
          student: { select: { user: { select: { name: true } } } },
          supervisions: {
            where: { active: true, type: "DIRECTOR" },
            select: { user: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
    take: 50,
  });

  return alerts.map((alert) => ({
    id: alert.id,
    thesisId: alert.thesisId,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    detectedAt: alert.detectedAt,
    studentName: alert.thesis.student.user.name,
    directorName: alert.thesis.supervisions[0]?.user.name ?? null,
  }));
}
