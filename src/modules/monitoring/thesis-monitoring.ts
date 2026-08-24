import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/errors";
import { getThesisMonitoringStatus } from "./monitoring";
import type { MonitoringPeriod, MonitoringResult, MonitoringSettings } from "./types";

/** Umbrales por defecto si un programa todavía no tiene configuración propia. */
export const DEFAULT_SETTINGS: MonitoringSettings = {
  minimumAdvisoriesPerPeriod: 2,
  warningDaysWithoutAdvisory: 30,
  criticalDaysWithoutAdvisory: 45,
  riskWindowDaysBeforeDeadline: 28,
  missedAdvisoryGraceDays: 7,
  requireNextAdvisoryDate: false,
  alertsEnabled: true,
};

export interface SupervisorSummary {
  id: string;
  userId: string;
  name: string;
  email: string;
  startedAt: Date;
}

export interface ThesisMonitoringRow {
  thesisId: string;
  title: string;
  status: string;
  assignedAt: Date | null;
  programId: string;
  programName: string;
  studentUserId: string;
  studentProfileId: string;
  studentName: string;
  studentCode: string;
  studentSemester: number;
  cohortName: string | null;
  director: SupervisorSummary | null;
  codirector: SupervisorSummary | null;
  period: MonitoringPeriod | null;
  settings: MonitoringSettings;
  monitoring: MonitoringResult;
}

const thesisInclude = {
  program: { select: { id: true, name: true } },
  student: {
    select: {
      id: true,
      studentCode: true,
      currentSemester: true,
      userId: true,
      user: { select: { name: true, email: true } },
      cohort: { select: { name: true } },
    },
  },
  supervisions: {
    where: { active: true },
    select: {
      id: true,
      userId: true,
      type: true,
      startedAt: true,
      user: { select: { name: true, email: true } },
    },
  },
  advisories: {
    select: {
      id: true,
      periodId: true,
      status: true,
      scheduledDate: true,
      actualDate: true,
      nextAdvisoryDate: true,
    },
    orderBy: { scheduledDate: "asc" },
  },
} satisfies Prisma.ThesisInclude;

function toSettings(row: {
  minimumAdvisoriesPerPeriod: number;
  warningDaysWithoutAdvisory: number;
  criticalDaysWithoutAdvisory: number;
  riskWindowDaysBeforeDeadline: number;
  missedAdvisoryGraceDays: number;
  requireNextAdvisoryDate: boolean;
  alertsEnabled: boolean;
} | null): MonitoringSettings {
  return row ? { ...row } : { ...DEFAULT_SETTINGS };
}

/**
 * Calcula el estado de monitoreo de un conjunto de trabajos.
 * Carga en dos consultas (trabajos + contexto de programas) para no incurrir
 * en N+1 al pintar el dashboard del coordinador.
 */
export async function getMonitoringRows(
  where: Prisma.ThesisWhereInput,
  options: { currentDate?: Date } = {},
): Promise<ThesisMonitoringRow[]> {
  const currentDate = options.currentDate ?? new Date();

  const theses = await prisma.thesis.findMany({
    where,
    include: thesisInclude,
    orderBy: { createdAt: "desc" },
  });

  if (theses.length === 0) return [];

  const programIds = [...new Set(theses.map((t) => t.programId))];
  const [settingsRows, periods] = await Promise.all([
    prisma.programSettings.findMany({ where: { programId: { in: programIds } } }),
    prisma.academicPeriod.findMany({
      where: { programId: { in: programIds }, active: true },
    }),
  ]);

  const settingsByProgram = new Map(settingsRows.map((s) => [s.programId, toSettings(s)]));
  const periodByProgram = new Map(periods.map((p) => [p.programId, p]));

  return theses.map((thesis) => {
    const settings = settingsByProgram.get(thesis.programId) ?? { ...DEFAULT_SETTINGS };
    const periodRow = periodByProgram.get(thesis.programId) ?? null;
    const period: MonitoringPeriod | null = periodRow
      ? {
          id: periodRow.id,
          name: periodRow.name,
          startDate: periodRow.startDate,
          endDate: periodRow.endDate,
          advisoryDeadline: periodRow.advisoryDeadline,
        }
      : null;

    const director = thesis.supervisions.find((s) => s.type === "DIRECTOR") ?? null;
    const codirector = thesis.supervisions.find((s) => s.type === "CODIRECTOR") ?? null;

    const periodAdvisories = period
      ? thesis.advisories.filter((a) => a.periodId === period.id)
      : [];

    const monitoring = getThesisMonitoringStatus({
      thesis: {
        id: thesis.id,
        status: thesis.status,
        assignedAt: thesis.assignedAt,
        hasActiveDirector: Boolean(director),
      },
      advisories: periodAdvisories.map((a) => ({
        id: a.id,
        status: a.status,
        scheduledDate: a.scheduledDate,
        actualDate: a.actualDate,
        nextAdvisoryDate: a.nextAdvisoryDate,
      })),
      period: period ?? {
        id: "sin-periodo",
        name: "Sin periodo activo",
        startDate: thesis.assignedAt ?? thesis.createdAt,
        endDate: currentDate,
        advisoryDeadline: null,
      },
      settings,
      currentDate,
    });

    return {
      thesisId: thesis.id,
      title: thesis.title,
      status: thesis.status,
      assignedAt: thesis.assignedAt,
      programId: thesis.programId,
      programName: thesis.program.name,
      studentUserId: thesis.student.userId,
      studentProfileId: thesis.student.id,
      studentName: thesis.student.user.name,
      studentCode: thesis.student.studentCode,
      studentSemester: thesis.student.currentSemester,
      cohortName: thesis.student.cohort?.name ?? null,
      director: director
        ? {
            id: director.id,
            userId: director.userId,
            name: director.user.name,
            email: director.user.email,
            startedAt: director.startedAt,
          }
        : null,
      codirector: codirector
        ? {
            id: codirector.id,
            userId: codirector.userId,
            name: codirector.user.name,
            email: codirector.user.email,
            startedAt: codirector.startedAt,
          }
        : null,
      period,
      settings,
      monitoring,
    };
  });
}

/** Estado de monitoreo de un único trabajo. */
export async function getMonitoringRow(
  thesisId: string,
  options: { currentDate?: Date } = {},
): Promise<ThesisMonitoringRow> {
  const [row] = await getMonitoringRows({ id: thesisId }, options);
  if (!row) throw new NotFoundError("El trabajo de grado no existe.");
  return row;
}

/** Resumen agregado para las tarjetas de indicadores. */
export interface MonitoringSummary {
  total: number;
  onTrack: number;
  followUp: number;
  alert: number;
  completedAdvisories: number;
  scheduledAdvisories: number;
  withoutDirector: number;
}

export function summarize(rows: ThesisMonitoringRow[], scheduledAdvisories = 0): MonitoringSummary {
  // El semáforo describe trabajos en curso: uno terminado o cancelado ya no
  // está en seguimiento y contarlo como "al día" falsearía el indicador.
  const enCurso = rows.filter((r) => r.status === "ACTIVE");

  return {
    total: rows.length,
    onTrack: enCurso.filter((r) => r.monitoring.status === "ON_TRACK").length,
    followUp: enCurso.filter((r) => r.monitoring.status === "FOLLOW_UP").length,
    alert: enCurso.filter((r) => r.monitoring.status === "ALERT").length,
    completedAdvisories: rows.reduce((acc, r) => acc + r.monitoring.completedCount, 0),
    scheduledAdvisories,
    withoutDirector: enCurso.filter((r) => !r.director).length,
  };
}
