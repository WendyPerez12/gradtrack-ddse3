import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailures,
  isLocked,
  RATE_LIMIT,
  registerFailure,
  resetRateLimit,
} from "@/lib/auth/rate-limit";

const CORREO = "director1@gradtrack.test";
const T0 = new Date("2026-11-03T15:00:00.000Z").getTime();

describe("límite de intentos de inicio de sesión", () => {
  beforeEach(() => resetRateLimit());

  it("no bloquea a quien no ha fallado", () => {
    expect(isLocked(CORREO, T0)).toBe(false);
  });

  it("bloquea al agotar los intentos de la ventana", () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) registerFailure(CORREO, T0);
    expect(isLocked(CORREO, T0)).toBe(true);
  });

  it("no bloquea antes de agotarlos", () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS - 1; i++) registerFailure(CORREO, T0);
    expect(isLocked(CORREO, T0)).toBe(false);
  });

  it("libera al pasar la ventana de tiempo", () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) registerFailure(CORREO, T0);
    expect(isLocked(CORREO, T0 + RATE_LIMIT.WINDOW_MS + 1000)).toBe(false);
  });

  it("un inicio de sesión correcto limpia el contador", () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) registerFailure(CORREO, T0);
    clearFailures(CORREO);
    expect(isLocked(CORREO, T0)).toBe(false);
  });

  it("el bloqueo es por correo, no global", () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) registerFailure(CORREO, T0);
    expect(isLocked("otro@gradtrack.test", T0)).toBe(false);
  });

  it("no distingue mayúsculas en el correo", () => {
    for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) registerFailure(CORREO.toUpperCase(), T0);
    expect(isLocked(CORREO, T0)).toBe(true);
  });
});
