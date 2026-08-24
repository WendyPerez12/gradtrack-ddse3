import { describe, expect, it } from "vitest";
import {
  countCompletedAdvisories,
  evaluateAlerts,
  getThesisMonitoringStatus,
  lastCompletedAdvisoryDate,
  nextScheduledAdvisory,
} from "@/modules/monitoring/monitoring";
import type {
  MonitoringAdvisory,
  MonitoringInput,
  MonitoringPeriod,
  MonitoringSettings,
} from "@/modules/monitoring/types";

/**
 * Todas las pruebas fijan `currentDate`: la lógica nunca llama a new Date()
 * por su cuenta, así los resultados son reproducibles (§91).
 */
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
// `currentDate` es un instante real, no un día: 10:00 de la mañana en Bogotá.
const HOY = new Date("2026-11-03T15:00:00.000Z");

const SETTINGS: MonitoringSettings = {
  minimumAdvisoriesPerPeriod: 2,
  warningDaysWithoutAdvisory: 30,
  criticalDaysWithoutAdvisory: 45,
  riskWindowDaysBeforeDeadline: 28,
  missedAdvisoryGraceDays: 7,
  requireNextAdvisoryDate: false,
  alertsEnabled: true,
};

const PERIODO: MonitoringPeriod = {
  id: "p1",
  name: "2026-2",
  startDate: day("2026-07-20"),
  endDate: day("2026-12-15"),
  advisoryDeadline: null,
};

function advisory(overrides: Partial<MonitoringAdvisory> & { id: string }): MonitoringAdvisory {
  return {
    status: "COMPLETED",
    scheduledDate: day("2026-08-01"),
    actualDate: null,
    nextAdvisoryDate: null,
    ...overrides,
  };
}

function input(overrides: Partial<MonitoringInput> = {}): MonitoringInput {
  return {
    thesis: { id: "t1", status: "ACTIVE", assignedAt: day("2026-07-20"), hasActiveDirector: true },
    advisories: [],
    period: PERIODO,
    settings: SETTINGS,
    currentDate: HOY,
    ...overrides,
  };
}

describe("countCompletedAdvisories", () => {
  it("cuenta cero cuando no hay asesorías", () => {
    expect(countCompletedAdvisories([])).toBe(0);
  });

  it("cuenta una asesoría realizada", () => {
    expect(countCompletedAdvisories([advisory({ id: "a1" })])).toBe(1);
  });

  it("cuenta dos asesorías realizadas", () => {
    expect(countCompletedAdvisories([advisory({ id: "a1" }), advisory({ id: "a2" })])).toBe(2);
  });

  it("no cuenta una asesoría programada (CA-03)", () => {
    expect(countCompletedAdvisories([advisory({ id: "a1", status: "SCHEDULED" })])).toBe(0);
  });

  it("no cuenta una asesoría cancelada, no realizada ni reprogramada", () => {
    const advisories = [
      advisory({ id: "a1", status: "CANCELLED" }),
      advisory({ id: "a2", status: "NOT_COMPLETED" }),
      advisory({ id: "a3", status: "RESCHEDULED" }),
    ];
    expect(countCompletedAdvisories(advisories)).toBe(0);
  });

  it("cuenta solo las realizadas en una mezcla de estados (CA-04)", () => {
    const advisories = [
      advisory({ id: "a1" }),
      advisory({ id: "a2", status: "SCHEDULED" }),
      advisory({ id: "a3", status: "NOT_COMPLETED" }),
      advisory({ id: "a4" }),
    ];
    expect(countCompletedAdvisories(advisories)).toBe(2);
  });
});

describe("fechas derivadas", () => {
  it("toma la fecha real cuando existe y la programada si no", () => {
    const advisories = [
      advisory({ id: "a1", scheduledDate: day("2026-08-01"), actualDate: day("2026-08-05") }),
      advisory({ id: "a2", scheduledDate: day("2026-09-01") }),
    ];
    expect(lastCompletedAdvisoryDate(advisories)).toEqual(day("2026-09-01"));
  });

  it("la próxima asesoría es la programada más cercana a futuro", () => {
    const advisories = [
      advisory({ id: "a1", status: "SCHEDULED", scheduledDate: day("2026-12-01") }),
      advisory({ id: "a2", status: "SCHEDULED", scheduledDate: day("2026-11-10") }),
      advisory({ id: "a3", status: "SCHEDULED", scheduledDate: day("2026-10-01") }),
    ];
    expect(nextScheduledAdvisory(advisories, HOY)?.id).toBe("a2");
  });
});

describe("evaluateAlerts — inactividad (§28)", () => {
  it("no alerta con menos de 30 días desde la última asesoría", () => {
    const alerts = evaluateAlerts(
      input({ advisories: [advisory({ id: "a1", actualDate: day("2026-10-20") })] }),
    );
    expect(alerts.filter((a) => a.type === "INACTIVITY")).toHaveLength(0);
  });

  it("alerta como advertencia a los 30 días exactos", () => {
    const alerts = evaluateAlerts(
      input({ advisories: [advisory({ id: "a1", actualDate: day("2026-10-04") })] }),
    );
    const inactivity = alerts.find((a) => a.type === "INACTIVITY");
    expect(inactivity?.severity).toBe("WARNING");
  });

  it("escala a crítica a los 45 días", () => {
    const alerts = evaluateAlerts(
      input({ advisories: [advisory({ id: "a1", actualDate: day("2026-09-19") })] }),
    );
    const inactivity = alerts.find((a) => a.type === "INACTIVITY");
    expect(inactivity?.severity).toBe("CRITICAL");
  });

  it("usa los umbrales configurados y no números fijos (CA-09)", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [advisory({ id: "a1", actualDate: day("2026-10-20") })],
        settings: { ...SETTINGS, warningDaysWithoutAdvisory: 10, criticalDaysWithoutAdvisory: 12 },
      }),
    );
    expect(alerts.find((a) => a.type === "INACTIVITY")?.severity).toBe("CRITICAL");
  });
});

describe("evaluateAlerts — sin primera asesoría (§27)", () => {
  it("no alerta antes del umbral", () => {
    const alerts = evaluateAlerts(
      input({
        thesis: { id: "t1", status: "ACTIVE", assignedAt: day("2026-10-20"), hasActiveDirector: true },
      }),
    );
    expect(alerts.find((a) => a.type === "NO_FIRST_ADVISORY")).toBeUndefined();
  });

  it("alerta como crítica cuando supera el umbral crítico", () => {
    const alerts = evaluateAlerts(
      input({
        thesis: { id: "t1", status: "ACTIVE", assignedAt: day("2026-08-01"), hasActiveDirector: true },
      }),
    );
    expect(alerts.find((a) => a.type === "NO_FIRST_ADVISORY")?.severity).toBe("CRITICAL");
  });

  it("no genera alertas si el trabajo no tiene director activo", () => {
    const alerts = evaluateAlerts(
      input({
        thesis: { id: "t1", status: "ACTIVE", assignedAt: null, hasActiveDirector: false },
      }),
    );
    expect(alerts).toHaveLength(0);
  });
});

describe("evaluateAlerts — asesoría incumplida (§29)", () => {
  it("no alerta dentro de los días de gracia", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-25") }),
          advisory({ id: "a2", status: "SCHEDULED", scheduledDate: day("2026-10-30") }),
        ],
      }),
    );
    expect(alerts.find((a) => a.type === "MISSED_ADVISORY")).toBeUndefined();
  });

  it("alerta cuando la cita venció hace más días que la gracia", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-25") }),
          advisory({ id: "a2", status: "SCHEDULED", scheduledDate: day("2026-10-20") }),
        ],
      }),
    );
    expect(alerts.find((a) => a.type === "MISSED_ADVISORY")?.severity).toBe("WARNING");
  });
});

describe("evaluateAlerts — mínimo del periodo (§31)", () => {
  it("avisa por mínimo en riesgo dentro de la ventana previa al cierre", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [advisory({ id: "a1", actualDate: day("2026-10-25") })],
        period: { ...PERIODO, endDate: day("2026-11-20") },
      }),
    );
    expect(alerts.find((a) => a.type === "MINIMUM_ADVISORIES_RISK")?.severity).toBe("WARNING");
  });

  it("no avisa por riesgo si ya cumplió el mínimo", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-25") }),
          advisory({ id: "a2", actualDate: day("2026-10-30") }),
        ],
        period: { ...PERIODO, endDate: day("2026-11-20") },
      }),
    );
    expect(alerts.find((a) => a.type === "MINIMUM_ADVISORIES_RISK")).toBeUndefined();
  });

  it("marca incumplimiento crítico cuando el periodo ya cerró", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [advisory({ id: "a1", actualDate: day("2026-09-25") })],
        period: { ...PERIODO, endDate: day("2026-10-30") },
      }),
    );
    expect(alerts.find((a) => a.type === "MINIMUM_ADVISORIES_NOT_MET")?.severity).toBe("CRITICAL");
  });

  it("respeta advisoryDeadline por encima de endDate", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [advisory({ id: "a1", actualDate: day("2026-10-25") })],
        period: { ...PERIODO, endDate: day("2026-12-15"), advisoryDeadline: day("2026-11-01") },
      }),
    );
    expect(alerts.find((a) => a.type === "MINIMUM_ADVISORIES_NOT_MET")).toBeDefined();
  });
});

describe("evaluateAlerts — sin próxima asesoría (§30)", () => {
  it("solo aplica si el programa lo exige", () => {
    const base = {
      advisories: [advisory({ id: "a1", actualDate: day("2026-10-25") })],
    };
    expect(evaluateAlerts(input(base)).find((a) => a.type === "NO_NEXT_ADVISORY")).toBeUndefined();
    const withRule = evaluateAlerts(
      input({ ...base, settings: { ...SETTINGS, requireNextAdvisoryDate: true } }),
    );
    expect(withRule.find((a) => a.type === "NO_NEXT_ADVISORY")?.severity).toBe("INFO");
  });

  it("no alerta si ya hay próxima fecha acordada", () => {
    const alerts = evaluateAlerts(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-25"), nextAdvisoryDate: day("2026-11-20") }),
        ],
        settings: { ...SETTINGS, requireNextAdvisoryDate: true },
      }),
    );
    expect(alerts.find((a) => a.type === "NO_NEXT_ADVISORY")).toBeUndefined();
  });
});

describe("evaluateAlerts — interruptor del programa", () => {
  it("no genera nada si las alertas están desactivadas", () => {
    const alerts = evaluateAlerts(
      input({ settings: { ...SETTINGS, alertsEnabled: false }, advisories: [] }),
    );
    expect(alerts).toHaveLength(0);
  });
});

describe("getThesisMonitoringStatus — semáforo (§32)", () => {
  it("verde cuando cumple el mínimo y no hay alertas", () => {
    const result = getThesisMonitoringStatus(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-20") }),
          advisory({ id: "a2", actualDate: day("2026-10-28") }),
        ],
      }),
    );
    expect(result.status).toBe("ON_TRACK");
    expect(result.completedCount).toBe(2);
    expect(result.requiredCount).toBe(2);
  });

  it("amarillo con una alerta de advertencia (CA-02)", () => {
    const result = getThesisMonitoringStatus(
      input({ advisories: [advisory({ id: "a1", actualDate: day("2026-10-01") })] }),
    );
    expect(result.status).toBe("FOLLOW_UP");
    expect(result.completedCount).toBe(1);
    expect(result.requiredCount).toBe(2);
  });

  it("rojo con una alerta crítica (CA-01)", () => {
    const result = getThesisMonitoringStatus(
      input({
        thesis: { id: "t1", status: "ACTIVE", assignedAt: day("2026-08-01"), hasActiveDirector: true },
      }),
    );
    expect(result.status).toBe("ALERT");
    expect(result.completedCount).toBe(0);
  });

  it("amarillo cuando no hay director asignado", () => {
    const result = getThesisMonitoringStatus(
      input({ thesis: { id: "t1", status: "ACTIVE", assignedAt: null, hasActiveDirector: false } }),
    );
    expect(result.status).toBe("FOLLOW_UP");
    expect(result.reasons.join(" ")).toContain("director");
  });

  it("informa días sin asesoría y próxima fecha", () => {
    const result = getThesisMonitoringStatus(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-20") }),
          advisory({ id: "a2", status: "SCHEDULED", scheduledDate: day("2026-11-15") }),
        ],
      }),
    );
    expect(result.daysSinceLastAdvisory).toBe(14);
    expect(result.nextAdvisoryDate).toEqual(day("2026-11-15"));
  });

  it("una asesoría programada no mueve el contador (CA-03)", () => {
    const result = getThesisMonitoringStatus(
      input({
        advisories: [
          advisory({ id: "a1", actualDate: day("2026-10-25") }),
          advisory({ id: "a2", status: "SCHEDULED", scheduledDate: day("2026-11-10") }),
        ],
      }),
    );
    expect(result.completedCount).toBe(1);
  });
});
