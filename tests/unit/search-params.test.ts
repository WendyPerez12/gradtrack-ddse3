import { describe, expect, it } from "vitest";
import {
  ADVISORY_STATUSES,
  ALERT_STATUSES,
  pickEnum,
  pickEnumOr,
} from "@/lib/validations/search-params";

describe("saneamiento de parámetros de URL", () => {
  it("acepta un valor de la lista blanca", () => {
    expect(pickEnum("COMPLETED", ADVISORY_STATUSES)).toBe("COMPLETED");
  });

  it("descarta un valor inventado en lugar de pasarlo a la consulta", () => {
    // Regresión: `?estado=FOO` llegaba a Prisma y rompía la página.
    expect(pickEnum("FOO", ADVISORY_STATUSES)).toBeUndefined();
    expect(pickEnum("'; drop table users;--", ADVISORY_STATUSES)).toBeUndefined();
  });

  it("trata el parámetro ausente como sin filtro", () => {
    expect(pickEnum(undefined, ADVISORY_STATUSES)).toBeUndefined();
    expect(pickEnum("", ADVISORY_STATUSES)).toBeUndefined();
  });

  it("cae al valor por defecto cuando el parámetro no sirve", () => {
    expect(pickEnumOr("BAR", ALERT_STATUSES, "ACTIVE")).toBe("ACTIVE");
    expect(pickEnumOr("RESOLVED", ALERT_STATUSES, "ACTIVE")).toBe("RESOLVED");
  });
});
