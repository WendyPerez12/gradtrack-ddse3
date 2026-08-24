import { daysBetween, formatShortDate, toCalendarDay, toInstitutionalDay } from "@/lib/dates";
import type {
  EvaluatedAlert,
  MonitoringAdvisory,
  MonitoringInput,
  MonitoringResult,
  MonitoringStatus,
} from "./types";

/** Estados que NO cuentan como asesoría cumplida (§21, CA-03). */
const COUNTS_AS_COMPLETED = "COMPLETED";

/**
 * Cuenta las asesorías efectivamente cumplidas.
 * Solo `COMPLETED` cuenta: programada, cancelada, reprogramada o no realizada
 * nunca suman para el mínimo del periodo.
 */
export function countCompletedAdvisories(advisories: MonitoringAdvisory[]): number {
  return advisories.filter((a) => a.status === COUNTS_AS_COMPLETED).length;
}

/** Fecha efectiva de una asesoría: la real si se registró, si no la programada. */
export function effectiveDate(advisory: MonitoringAdvisory): Date {
  return toCalendarDay(advisory.actualDate ?? advisory.scheduledDate);
}

/** Última asesoría cumplida (fecha efectiva más reciente). */
export function lastCompletedAdvisoryDate(advisories: MonitoringAdvisory[]): Date | null {
  const completed = advisories
    .filter((a) => a.status === COUNTS_AS_COMPLETED)
    .map(effectiveDate)
    .sort((a, b) => a.getTime() - b.getTime());
  return completed.length ? completed[completed.length - 1]! : null;
}

/** Próxima asesoría programada a futuro (incluye hoy). */
export function nextScheduledAdvisory(
  advisories: MonitoringAdvisory[],
  currentDate: Date,
): MonitoringAdvisory | null {
  const today = toInstitutionalDay(currentDate);
  const upcoming = advisories
    .filter((a) => a.status === "SCHEDULED" && toCalendarDay(a.scheduledDate) >= today)
    .sort((a, b) => toCalendarDay(a.scheduledDate).getTime() - toCalendarDay(b.scheduledDate).getTime());
  return upcoming[0] ?? null;
}

/** Asesorías programadas cuya fecha ya pasó y siguen sin confirmar ni reprogramar. */
export function overdueScheduledAdvisories(
  advisories: MonitoringAdvisory[],
  currentDate: Date,
): MonitoringAdvisory[] {
  const today = toInstitutionalDay(currentDate);
  return advisories
    .filter((a) => a.status === "SCHEDULED" && toCalendarDay(a.scheduledDate) < today)
    .sort((a, b) => toCalendarDay(a.scheduledDate).getTime() - toCalendarDay(b.scheduledDate).getTime());
}

/** Fecha límite del periodo para cumplir el mínimo. */
export function deadlineOf(period: MonitoringInput["period"]): Date {
  return toCalendarDay(period.advisoryDeadline ?? period.endDate);
}

/**
 * Motor de alertas. Devuelve las alertas que la situación actual justifica.
 * No persiste nada: la sincronización con la tabla `alerts` vive en el servicio
 * de aplicación (`syncThesisAlerts`), que compara este resultado con lo guardado.
 */
export function evaluateAlerts(input: MonitoringInput): EvaluatedAlert[] {
  const { thesis, advisories, period, settings, currentDate } = input;

  if (!settings.alertsEnabled) return [];
  if (thesis.status !== "ACTIVE") return [];
  if (!thesis.hasActiveDirector) return [];

  const alerts: EvaluatedAlert[] = [];
  const today = toInstitutionalDay(currentDate);
  const completedCount = countCompletedAdvisories(advisories);
  const lastDate = lastCompletedAdvisoryDate(advisories);
  const deadline = deadlineOf(period);
  const daysUntilDeadline = daysBetween(today, deadline);
  const required = settings.minimumAdvisoriesPerPeriod;

  // --- 1. Sin primera asesoría (§27) --------------------------------------
  if (completedCount === 0) {
    const since = thesis.assignedAt
      ? toInstitutionalDay(thesis.assignedAt)
      : toCalendarDay(period.startDate);
    const daysSinceStart = daysBetween(since, today);
    if (daysSinceStart > settings.warningDaysWithoutAdvisory) {
      alerts.push({
        type: "NO_FIRST_ADVISORY",
        severity:
          daysSinceStart >= settings.criticalDaysWithoutAdvisory ? "CRITICAL" : "WARNING",
        message: `Sin ninguna asesoría realizada tras ${daysSinceStart} días desde el inicio del seguimiento.`,
        metadata: { daysSinceStart, since: since.toISOString() },
      });
    }
  }

  // --- 2. Inactividad (§28) -----------------------------------------------
  if (lastDate) {
    const daysSinceLast = daysBetween(lastDate, today);
    if (daysSinceLast >= settings.criticalDaysWithoutAdvisory) {
      alerts.push({
        type: "INACTIVITY",
        severity: "CRITICAL",
        message: `Han pasado ${daysSinceLast} días desde la última asesoría (${formatShortDate(lastDate)}).`,
        metadata: { daysSinceLast, lastAdvisoryDate: lastDate.toISOString() },
      });
    } else if (daysSinceLast >= settings.warningDaysWithoutAdvisory) {
      alerts.push({
        type: "INACTIVITY",
        severity: "WARNING",
        message: `Han pasado ${daysSinceLast} días desde la última asesoría (${formatShortDate(lastDate)}).`,
        metadata: { daysSinceLast, lastAdvisoryDate: lastDate.toISOString() },
      });
    }
  }

  // --- 3. Asesoría programada que no se realizó (§29) ----------------------
  const overdue = overdueScheduledAdvisories(advisories, currentDate);
  const missed = overdue.filter(
    (a) => daysBetween(toCalendarDay(a.scheduledDate), today) > settings.missedAdvisoryGraceDays,
  );
  if (missed.length > 0) {
    const oldest = missed[0]!;
    const daysOverdue = daysBetween(toCalendarDay(oldest.scheduledDate), today);
    alerts.push({
      type: "MISSED_ADVISORY",
      severity: "WARNING",
      message: `La asesoría del ${formatShortDate(oldest.scheduledDate)} sigue sin confirmarse ni reprogramarse (${daysOverdue} días).`,
      metadata: { advisoryId: oldest.id, daysOverdue, count: missed.length },
    });
  }

  // --- 4. Sin próxima asesoría acordada (§30) -----------------------------
  if (settings.requireNextAdvisoryDate && completedCount > 0) {
    const hasUpcoming = nextScheduledAdvisory(advisories, currentDate) !== null;
    const hasAgreedNextDate = advisories.some(
      (a) => a.nextAdvisoryDate && toCalendarDay(a.nextAdvisoryDate) >= today,
    );
    if (!hasUpcoming && !hasAgreedNextDate) {
      alerts.push({
        type: "NO_NEXT_ADVISORY",
        severity: "INFO",
        message: "No hay una próxima asesoría acordada después de la última sesión realizada.",
        metadata: {},
      });
    }
  }

  // --- 5. Mínimo del periodo (§31) ----------------------------------------
  if (completedCount < required) {
    if (daysUntilDeadline < 0) {
      alerts.push({
        type: "MINIMUM_ADVISORIES_NOT_MET",
        severity: "CRITICAL",
        message: `El periodo ${period.name} cerró con ${completedCount} de ${required} asesorías requeridas.`,
        metadata: { completedCount, required, deadline: deadline.toISOString() },
      });
    } else if (daysUntilDeadline <= settings.riskWindowDaysBeforeDeadline) {
      alerts.push({
        type: "MINIMUM_ADVISORIES_RISK",
        severity: "WARNING",
        message: `Faltan ${daysUntilDeadline} días para el cierre del periodo con ${completedCount} de ${required} asesorías.`,
        metadata: { completedCount, required, daysUntilDeadline },
      });
    }
  }

  return alerts;
}

/** Severidad más alta de un conjunto de alertas. */
function highestSeverity(alerts: EvaluatedAlert[]): "INFO" | "WARNING" | "CRITICAL" | null {
  if (alerts.some((a) => a.severity === "CRITICAL")) return "CRITICAL";
  if (alerts.some((a) => a.severity === "WARNING")) return "WARNING";
  if (alerts.some((a) => a.severity === "INFO")) return "INFO";
  return null;
}

/**
 * Servicio central de estado del trabajo (§90).
 * Toda la aplicación —dashboards, tablas, reportes— debe usar esta función.
 * El semáforo nunca se calcula de forma distinta en cada página.
 */
export function getThesisMonitoringStatus(input: MonitoringInput): MonitoringResult {
  const { thesis, advisories, period, settings, currentDate } = input;

  const today = toInstitutionalDay(currentDate);
  const completedCount = countCompletedAdvisories(advisories);
  const requiredCount = settings.minimumAdvisoriesPerPeriod;
  const lastAdvisoryDate = lastCompletedAdvisoryDate(advisories);
  const next = nextScheduledAdvisory(advisories, currentDate);
  const agreedNext = advisories
    .map((a) => a.nextAdvisoryDate)
    .filter((d): d is Date => Boolean(d) && toCalendarDay(d as Date) >= today)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const nextAdvisoryDate = next ? toCalendarDay(next.scheduledDate) : (agreedNext ?? null);
  const daysSinceLastAdvisory = lastAdvisoryDate ? daysBetween(lastAdvisoryDate, today) : null;
  const daysUntilDeadline = daysBetween(today, deadlineOf(period));

  const alerts = evaluateAlerts(input);
  const reasons: string[] = alerts.map((a) => a.message);

  let status: MonitoringStatus;
  if (thesis.status !== "ACTIVE") {
    status = "ON_TRACK";
    reasons.push(`El trabajo no está activo (${thesis.status}).`);
  } else if (!thesis.hasActiveDirector) {
    status = "FOLLOW_UP";
    reasons.push("El trabajo no tiene director activo asignado.");
  } else {
    const severity = highestSeverity(alerts);
    status = severity === "CRITICAL" ? "ALERT" : severity === "WARNING" ? "FOLLOW_UP" : "ON_TRACK";
  }

  if (status === "ON_TRACK" && reasons.length === 0) {
    reasons.push(
      completedCount >= requiredCount
        ? `Cumple el mínimo del periodo (${completedCount} de ${requiredCount}).`
        : `Sin alertas activas (${completedCount} de ${requiredCount} asesorías).`,
    );
  }

  return {
    status,
    completedCount,
    requiredCount,
    lastAdvisoryDate,
    nextAdvisoryDate,
    daysSinceLastAdvisory,
    daysUntilDeadline,
    hasActiveDirector: thesis.hasActiveDirector,
    reasons,
    alerts,
  };
}

export const MONITORING_STATUS_LABEL: Record<MonitoringStatus, string> = {
  ON_TRACK: "Al día",
  FOLLOW_UP: "Seguimiento",
  ALERT: "Alerta",
};

export const ALERT_TYPE_LABEL: Record<EvaluatedAlert["type"], string> = {
  NO_FIRST_ADVISORY: "Sin primera asesoría",
  INACTIVITY: "Inactividad",
  MISSED_ADVISORY: "Asesoría incumplida",
  NO_NEXT_ADVISORY: "Sin próxima asesoría",
  MINIMUM_ADVISORIES_RISK: "Mínimo en riesgo",
  MINIMUM_ADVISORIES_NOT_MET: "Mínimo incumplido",
};

export const ALERT_SEVERITY_LABEL: Record<EvaluatedAlert["severity"], string> = {
  INFO: "Informativa",
  WARNING: "Advertencia",
  CRITICAL: "Crítica",
};
