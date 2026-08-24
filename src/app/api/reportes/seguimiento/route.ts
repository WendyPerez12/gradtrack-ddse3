import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/dates";
import { MONITORING_STATUS_LABEL } from "@/modules/monitoring/monitoring";
import { queryThesisList } from "@/modules/theses/thesis-query";

const HEADERS = [
  "Estudiante",
  "Código",
  "Programa",
  "Cohorte",
  "Semestre",
  "Director",
  "Codirector",
  "Asesorías requeridas",
  "Asesorías realizadas",
  "Última asesoría",
  "Próxima asesoría",
  "Días sin asesoría",
  "Estado",
];

function escapeCsv(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Exportación CSV del reporte de seguimiento (§55). */
export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (actor.role !== "ADMIN" && actor.role !== "COORDINADOR") {
    return NextResponse.json({ error: "No tienes permiso para exportar este reporte." }, { status: 403 });
  }

  const url = new URL(request.url);
  const list = await queryThesisList(actor, {
    q: url.searchParams.get("q") ?? undefined,
    programa: url.searchParams.get("programa") ?? undefined,
    cohorte: url.searchParams.get("cohorte") ?? undefined,
    semestre: url.searchParams.get("semestre") ?? undefined,
    director: url.searchParams.get("director") ?? undefined,
    estado: url.searchParams.get("estado") ?? undefined,
  });

  const lines = [
    HEADERS.join(";"),
    ...list.allRows.map((row) =>
      [
        row.studentName,
        row.studentCode,
        row.programName,
        row.cohortName ?? "",
        row.studentSemester,
        row.director?.name ?? "Sin asignar",
        row.codirector?.name ?? "",
        row.monitoring.requiredCount,
        row.monitoring.completedCount,
        row.monitoring.lastAdvisoryDate ? formatShortDate(row.monitoring.lastAdvisoryDate) : "",
        row.monitoring.nextAdvisoryDate ? formatShortDate(row.monitoring.nextAdvisoryDate) : "",
        row.monitoring.daysSinceLastAdvisory ?? "",
        MONITORING_STATUS_LABEL[row.monitoring.status],
      ]
        .map(escapeCsv)
        .join(";"),
    ),
  ];

  // BOM para que Excel reconozca los acentos.
  const csv = `﻿${lines.join("\r\n")}`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="seguimiento-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
