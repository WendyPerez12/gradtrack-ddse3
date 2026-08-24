import { describe, expect, it } from "vitest";
import {
  changeOwnPasswordSchema,
  createUserSchema,
  passwordSchema,
  suggestTemporaryPassword,
} from "@/lib/validations/user";
import { canUserManageUsers, canUserViewUsers, type Actor } from "@/lib/permissions/rules";

const actor = (overrides: Partial<Actor>): Actor => ({
  id: "u1",
  role: "DIRECTOR",
  programIds: [],
  studentProfileId: null,
  ...overrides,
});

describe("política de contraseñas", () => {
  it("rechaza contraseñas cortas", () => {
    expect(passwordSchema.safeParse("Ab1").success).toBe(false);
  });

  it("exige al menos una letra y un número", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("contraseña").success).toBe(false);
    expect(passwordSchema.safeParse("Aula2026").success).toBe(true);
  });

  it("acepta acentos y ñ como letras", () => {
    expect(passwordSchema.safeParse("añoescolar1").success).toBe(true);
  });

  it("la sugerencia cumple la política", () => {
    for (let i = 0; i < 20; i++) {
      expect(passwordSchema.safeParse(suggestTemporaryPassword()).success).toBe(true);
    }
  });
});

describe("cambio de la propia contraseña", () => {
  const base = { currentPassword: "Aula2026", newPassword: "Campus2027", confirmPassword: "Campus2027" };

  it("acepta un cambio válido", () => {
    expect(changeOwnPasswordSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza si la confirmación no coincide", () => {
    const result = changeOwnPasswordSchema.safeParse({ ...base, confirmPassword: "Otra2027" });
    expect(result.success).toBe(false);
  });

  it("rechaza repetir la contraseña actual", () => {
    const result = changeOwnPasswordSchema.safeParse({
      currentPassword: "Aula2026",
      newPassword: "Aula2026",
      confirmPassword: "Aula2026",
    });
    expect(result.success).toBe(false);
  });
});

describe("alta de cuentas", () => {
  const base = {
    name: "Rocío Palacios",
    email: "Rocio.Palacios@Institucion.edu.co",
    password: "Aula2026",
    programIds: ["prog-med"],
  };

  it("normaliza el correo a minúsculas", () => {
    const result = createUserSchema.safeParse({ ...base, role: "DIRECTOR" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("rocio.palacios@institucion.edu.co");
  });

  it("un estudiante necesita exactamente un programa", () => {
    const sinPrograma = createUserSchema.safeParse({
      ...base,
      role: "ESTUDIANTE",
      studentCode: "MED-2026-100",
      programIds: [],
    });
    expect(sinPrograma.success).toBe(false);

    const conDos = createUserSchema.safeParse({
      ...base,
      role: "ESTUDIANTE",
      studentCode: "MED-2026-100",
      programIds: ["a", "b"],
    });
    expect(conDos.success).toBe(false);
  });

  it("un estudiante necesita código", () => {
    const result = createUserSchema.safeParse({ ...base, role: "ESTUDIANTE", studentCode: "" });
    expect(result.success).toBe(false);
  });

  it("un docente necesita al menos un programa", () => {
    const result = createUserSchema.safeParse({ ...base, role: "DIRECTOR", programIds: [] });
    expect(result.success).toBe(false);
  });

  it("un administrador puede no tener programas", () => {
    const result = createUserSchema.safeParse({ ...base, role: "ADMIN", programIds: [] });
    expect(result.success).toBe(true);
  });
});

describe("permisos sobre cuentas", () => {
  it("solo la administración gestiona cuentas", () => {
    expect(canUserManageUsers(actor({ role: "ADMIN" }))).toBe(true);
    expect(canUserManageUsers(actor({ role: "COORDINADOR", programIds: ["p1"] }))).toBe(false);
    expect(canUserManageUsers(actor({ role: "DIRECTOR" }))).toBe(false);
    expect(canUserManageUsers(actor({ role: "ESTUDIANTE" }))).toBe(false);
  });

  it("la coordinación puede consultar el directorio", () => {
    expect(canUserViewUsers(actor({ role: "COORDINADOR", programIds: ["p1"] }))).toBe(true);
    expect(canUserViewUsers(actor({ role: "ADMIN" }))).toBe(true);
    expect(canUserViewUsers(actor({ role: "DIRECTOR" }))).toBe(false);
    expect(canUserViewUsers(actor({ role: "ESTUDIANTE" }))).toBe(false);
  });
});
