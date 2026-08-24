import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/env";

/**
 * Toda la lógica académica razona en días de calendario.
 *
 * Hay dos clases de valores y se normalizan distinto:
 *
 * 1. Los días guardados en columnas `@db.Date` (fecha de la asesoría, inicio y
 *    fin del periodo) llegan como medianoche UTC y YA SON un día calendario:
 *    convertirlos de zona horaria los correría un día. Solo se truncan en UTC.
 * 2. Los instantes reales (`new Date()`, `assignedAt`) sí deben convertirse a
 *    la zona institucional antes de saber a qué día pertenecen.
 */
export function toCalendarDay(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Día calendario al que pertenece un instante en la zona institucional. */
export function toInstitutionalDay(value: Date | string, timeZone: string = APP_TIMEZONE): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  const iso = formatInTimeZone(date, timeZone, "yyyy-MM-dd");
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Días de calendario entre dos días (b - a). Positivo si b es posterior. */
export function daysBetween(a: Date, b: Date): number {
  const dayA = toCalendarDay(a);
  const dayB = toCalendarDay(b);
  return Math.round((dayB.getTime() - dayA.getTime()) / 86_400_000);
}

/** Construye un día calendario a partir de un valor `yyyy-MM-dd` de formulario. */
export function parseDayInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** `yyyy-MM-dd` para inputs de tipo date. */
export function toDayInputValue(value: Date | null | undefined): string {
  if (!value) return "";
  return formatInTimeZone(value, "UTC", "yyyy-MM-dd");
}

const LONG_DATE = "d 'de' MMMM 'de' yyyy";

/** Fecha larga en español, p. ej. "3 de noviembre de 2026". */
export function formatLongDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return formatInTimeZone(value, "UTC", LONG_DATE, { locale: undefined })
    .replace(/January|February|March|April|May|June|July|August|September|October|November|December/g, (m) => MONTHS_ES[m] ?? m);
}

/** Fecha corta, p. ej. "03/11/2026". */
export function formatShortDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return formatInTimeZone(value, "UTC", "dd/MM/yyyy");
}

/** Fecha y hora en la zona institucional, para trazas y auditoría. */
export function formatDateTime(value: Date | null | undefined, timeZone: string = APP_TIMEZONE): string {
  if (!value) return "—";
  return formatInTimeZone(value, timeZone, "dd/MM/yyyy HH:mm");
}

const MONTHS_ES: Record<string, string> = {
  January: "enero",
  February: "febrero",
  March: "marzo",
  April: "abril",
  May: "mayo",
  June: "junio",
  July: "julio",
  August: "agosto",
  September: "septiembre",
  October: "octubre",
  November: "noviembre",
  December: "diciembre",
};

/** Hora local institucional (para valores por defecto en formularios). */
export function nowInTimeZone(timeZone: string = APP_TIMEZONE): Date {
  return toZonedTime(new Date(), timeZone);
}
