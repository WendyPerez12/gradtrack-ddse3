import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { DEFAULT_SETTINGS } from "@/modules/monitoring/thesis-monitoring";
import type { MonitoringSettings } from "@/modules/monitoring/types";

/** Periodo académico activo del programa. */
export async function getActivePeriod(programId: string) {
  return prisma.academicPeriod.findFirst({
    where: { programId, active: true },
    orderBy: { startDate: "desc" },
  });
}

export async function requireActivePeriod(programId: string) {
  const period = await getActivePeriod(programId);
  if (!period) {
    throw new NotFoundError(
      "El programa no tiene un periodo académico activo. Actívalo en Configuración antes de registrar asesorías.",
    );
  }
  return period;
}

/** Configuración del programa, con valores por defecto si aún no existe. */
export async function getProgramSettings(programId: string): Promise<MonitoringSettings> {
  const settings = await prisma.programSettings.findUnique({ where: { programId } });
  return settings ? { ...settings } : { ...DEFAULT_SETTINGS };
}

export async function listProgramsWithContext(programIds: string[] | null) {
  return prisma.program.findMany({
    where: programIds ? { id: { in: programIds } } : undefined,
    include: {
      settings: true,
      periods: { orderBy: { startDate: "desc" } },
      _count: { select: { theses: true, studentProfiles: true } },
    },
    orderBy: { name: "asc" },
  });
}
