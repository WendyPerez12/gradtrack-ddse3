import { describe, expect, it } from "vitest";
import {
  canUserAccessThesis,
  canUserConfirmAdvisory,
  canUserEditProgramSettings,
  canUserManageAdvisories,
  canUserManageAlerts,
  canUserManageThesisAssignment,
  type Actor,
  type ThesisAccessContext,
} from "@/lib/permissions/rules";

const thesis: ThesisAccessContext = {
  thesisId: "t1",
  programId: "prog-med",
  studentUserId: "user-student",
  activeSupervisorIds: ["user-director", "user-codirector"],
  allSupervisorIds: ["user-director", "user-codirector", "user-former-director"],
};

const actor = (overrides: Partial<Actor>): Actor => ({
  id: "user-x",
  role: "DIRECTOR",
  programIds: [],
  studentProfileId: null,
  ...overrides,
});

describe("canUserAccessThesis", () => {
  it("el administrador ve cualquier trabajo", () => {
    expect(canUserAccessThesis(actor({ role: "ADMIN" }), thesis)).toBe(true);
  });

  it("el coordinador ve los trabajos de sus programas (CA-07)", () => {
    const coordinator = actor({ role: "COORDINADOR", programIds: ["prog-med"] });
    expect(canUserAccessThesis(coordinator, thesis)).toBe(true);
  });

  it("el coordinador de otro programa no lo ve (CA-07)", () => {
    const otherCoordinator = actor({ role: "COORDINADOR", programIds: ["prog-ing"] });
    expect(canUserAccessThesis(otherCoordinator, thesis)).toBe(false);
  });

  it("el director asignado lo ve (CA-06)", () => {
    expect(canUserAccessThesis(actor({ id: "user-director" }), thesis)).toBe(true);
  });

  it("el codirector asignado lo ve (CA-06)", () => {
    expect(canUserAccessThesis(actor({ id: "user-codirector" }), thesis)).toBe(true);
  });

  it("un director ajeno no lo ve (CA-06)", () => {
    expect(canUserAccessThesis(actor({ id: "user-otro" }), thesis)).toBe(false);
  });

  it("un director anterior conserva la lectura del histórico", () => {
    expect(canUserAccessThesis(actor({ id: "user-former-director" }), thesis)).toBe(true);
  });

  it("el estudiante ve solo el suyo (CA-05)", () => {
    const owner = actor({ id: "user-student", role: "ESTUDIANTE", programIds: ["prog-med"] });
    const other = actor({ id: "user-otro-estudiante", role: "ESTUDIANTE", programIds: ["prog-med"] });
    expect(canUserAccessThesis(owner, thesis)).toBe(true);
    expect(canUserAccessThesis(other, thesis)).toBe(false);
  });
});

describe("canUserManageAdvisories", () => {
  it("el director activo puede gestionar asesorías", () => {
    expect(canUserManageAdvisories(actor({ id: "user-director" }), thesis)).toBe(true);
  });

  it("un director anterior ya no puede escribir", () => {
    expect(canUserManageAdvisories(actor({ id: "user-former-director" }), thesis)).toBe(false);
  });

  it("el coordinador del programa puede programar", () => {
    const coordinator = actor({ role: "COORDINADOR", programIds: ["prog-med"] });
    expect(canUserManageAdvisories(coordinator, thesis)).toBe(true);
  });

  it("el estudiante nunca puede gestionar asesorías", () => {
    const student = actor({ id: "user-student", role: "ESTUDIANTE", programIds: ["prog-med"] });
    expect(canUserManageAdvisories(student, thesis)).toBe(false);
  });
});

describe("canUserConfirmAdvisory", () => {
  it("solo el director o codirector activo confirman (§21)", () => {
    expect(canUserConfirmAdvisory(actor({ id: "user-director" }), thesis)).toBe(true);
    expect(canUserConfirmAdvisory(actor({ id: "user-codirector" }), thesis)).toBe(true);
  });

  it("el coordinador no confirma asesorías en esta versión", () => {
    const coordinator = actor({ role: "COORDINADOR", programIds: ["prog-med"] });
    expect(canUserConfirmAdvisory(coordinator, thesis)).toBe(false);
  });

  it("el estudiante no puede marcar la asesoría como realizada (§11)", () => {
    const student = actor({ id: "user-student", role: "ESTUDIANTE", programIds: ["prog-med"] });
    expect(canUserConfirmAdvisory(student, thesis)).toBe(false);
  });
});

describe("gestión del programa", () => {
  it("solo administración o la coordinación del programa asignan director", () => {
    expect(canUserManageThesisAssignment(actor({ role: "ADMIN" }), "prog-med")).toBe(true);
    expect(
      canUserManageThesisAssignment(actor({ role: "COORDINADOR", programIds: ["prog-med"] }), "prog-med"),
    ).toBe(true);
    expect(
      canUserManageThesisAssignment(actor({ role: "COORDINADOR", programIds: ["prog-ing"] }), "prog-med"),
    ).toBe(false);
    expect(canUserManageThesisAssignment(actor({ id: "user-director" }), "prog-med")).toBe(false);
  });

  it("los umbrales solo los edita quien administra el programa (§25)", () => {
    expect(
      canUserEditProgramSettings(actor({ role: "COORDINADOR", programIds: ["prog-med"] }), "prog-med"),
    ).toBe(true);
    expect(canUserEditProgramSettings(actor({ id: "user-director" }), "prog-med")).toBe(false);
  });
});

describe("canUserManageAlerts", () => {
  it("el estudiante nunca puede gestionar ni descartar sus alertas", () => {
    const student = actor({ id: "user-student", role: "ESTUDIANTE", programIds: ["prog-med"] });
    expect(canUserAccessThesis(student, thesis)).toBe(true);
    expect(canUserManageAlerts(student, thesis)).toBe(false);
  });

  it("un director anterior tampoco: conserva lectura, no escritura", () => {
    expect(canUserManageAlerts(actor({ id: "user-former-director" }), thesis)).toBe(false);
  });

  it("la coordinación del programa y el director activo sí", () => {
    expect(canUserManageAlerts(actor({ role: "COORDINADOR", programIds: ["prog-med"] }), thesis)).toBe(true);
    expect(canUserManageAlerts(actor({ id: "user-director" }), thesis)).toBe(true);
  });
});
