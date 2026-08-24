/**
 * Tipos del dominio de monitoreo.
 *
 * Este módulo es deliberadamente puro: no importa Prisma ni React. Recibe
 * datos planos y una `currentDate` explícita, de modo que las reglas se pueden
 * probar con fechas artificiales y reproducibles (ver §91 de la especificación).
 */

export type MonitoringStatus = "ON_TRACK" | "FOLLOW_UP" | "ALERT";

export type AdvisoryStatusValue =
  | "SCHEDULED"
  | "COMPLETED"
  | "NOT_COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED";

export type AlertTypeValue =
  | "NO_FIRST_ADVISORY"
  | "INACTIVITY"
  | "MISSED_ADVISORY"
  | "NO_NEXT_ADVISORY"
  | "MINIMUM_ADVISORIES_RISK"
  | "MINIMUM_ADVISORIES_NOT_MET";

export type AlertSeverityValue = "INFO" | "WARNING" | "CRITICAL";

/** Umbrales del programa. Ningún valor de estos vive hardcodeado en el código. */
export interface MonitoringSettings {
  minimumAdvisoriesPerPeriod: number;
  warningDaysWithoutAdvisory: number;
  criticalDaysWithoutAdvisory: number;
  riskWindowDaysBeforeDeadline: number;
  missedAdvisoryGraceDays: number;
  requireNextAdvisoryDate: boolean;
  alertsEnabled: boolean;
}

export interface MonitoringAdvisory {
  id: string;
  status: AdvisoryStatusValue;
  scheduledDate: Date;
  actualDate: Date | null;
  nextAdvisoryDate: Date | null;
}

export interface MonitoringPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  /** Fecha límite para cumplir el mínimo; si no existe se usa `endDate`. */
  advisoryDeadline: Date | null;
}

export interface MonitoringThesis {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "COMPLETED" | "CANCELLED";
  /** Fecha de asignación del director; desde aquí corre el seguimiento. */
  assignedAt: Date | null;
  hasActiveDirector: boolean;
}

export interface MonitoringInput {
  thesis: MonitoringThesis;
  /** Asesorías del periodo evaluado (cualquier estado). */
  advisories: MonitoringAdvisory[];
  /**
   * Periodo académico activo del programa. Puede ser `null`: un programa sin
   * periodo abierto no tiene contra qué medir el cumplimiento, y fabricar uno
   * produciría alertas falsas.
   */
  period: MonitoringPeriod | null;
  settings: MonitoringSettings;
  currentDate: Date;
}

export interface EvaluatedAlert {
  type: AlertTypeValue;
  severity: AlertSeverityValue;
  message: string;
  metadata: Record<string, unknown>;
}

export interface MonitoringResult {
  status: MonitoringStatus;
  completedCount: number;
  requiredCount: number;
  lastAdvisoryDate: Date | null;
  nextAdvisoryDate: Date | null;
  daysSinceLastAdvisory: number | null;
  daysUntilDeadline: number;
  hasActiveDirector: boolean;
  reasons: string[];
  alerts: EvaluatedAlert[];
}
