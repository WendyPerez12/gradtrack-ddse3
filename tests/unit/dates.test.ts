import { describe, expect, it } from "vitest";
import {
  daysBetween,
  parseDayInput,
  toCalendarDay,
  toDayInputValue,
  toInstitutionalDay,
} from "@/lib/dates";

describe("normalización de fechas", () => {
  it("convierte un instante al día calendario institucional", () => {
    // 3 de noviembre 02:00 UTC es todavía 2 de noviembre en Bogotá (UTC-5).
    const instante = new Date("2026-11-03T02:00:00.000Z");
    expect(toInstitutionalDay(instante).toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });

  it("no corre un día las fechas guardadas como columna date", () => {
    // Una asesoría del 15 de noviembre llega como medianoche UTC: ese ES su día.
    const columnaDate = new Date("2026-11-15T00:00:00.000Z");
    expect(toCalendarDay(columnaDate).toISOString()).toBe("2026-11-15T00:00:00.000Z");
  });

  it("es idempotente sobre un día ya normalizado", () => {
    const dia = new Date("2026-11-03T00:00:00.000Z");
    expect(toCalendarDay(toCalendarDay(dia))).toEqual(toCalendarDay(dia));
  });

  it("cuenta días de calendario entre fechas", () => {
    expect(daysBetween(new Date("2026-10-04T00:00:00Z"), new Date("2026-11-03T00:00:00Z"))).toBe(30);
  });

  it("devuelve negativo cuando la fecha objetivo ya pasó", () => {
    expect(daysBetween(new Date("2026-11-03T00:00:00Z"), new Date("2026-10-30T00:00:00Z"))).toBe(-4);
  });

  it("convierte el valor de un input date a día y de vuelta", () => {
    expect(toDayInputValue(parseDayInput("2026-11-03"))).toBe("2026-11-03");
  });
});
