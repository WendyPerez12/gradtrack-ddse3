import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatShortDate } from "@/lib/dates";
import { requireRole } from "@/lib/auth/session";
import { getActivePeriods } from "@/modules/programs/program-service";
import { queryThesisList, type ThesisListParams } from "@/modules/theses/thesis-query";
import type { ThesisMonitoringRow } from "@/modules/monitoring/thesis-monitoring";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ThesisListParams>;
}) {
  const actor = await requireRole(["ADMIN", "COORDINADOR"]);
  const params = await searchParams;
  const list = await queryThesisList(actor, { ...params, page: "1" });
  const periods = await getActivePeriods(actor.role === "ADMIN" ? null : actor.programIds);

  const columns: Column<ThesisMonitoringRow>[] = [
    {
      key: "student",
      header: "Estudiante",
      cell: (row) => (
        <Link href={`/trabajos/${row.thesisId}`} className="font-medium hover:text-brand">
          {row.studentName}
          <span className="block text-xs font-normal text-ink-faint">{row.studentCode}</span>
        </Link>
      ),
    },
    { key: "director", header: "Director", cell: (row) => row.director?.name ?? "Sin asignar" },
    { key: "cohort", header: "Cohorte", cell: (row) => row.cohortName ?? "—" },
    {
      key: "required",
      header: "Requeridas",
      cell: (row) => <span className="tabular-nums">{row.monitoring.requiredCount}</span>,
    },
    {
      key: "completed",
      header: "Realizadas",
      cell: (row) => <span className="tabular-nums">{row.monitoring.completedCount}</span>,
    },
    {
      key: "last",
      header: "Última asesoría",
      cell: (row) => (
        <span className="tabular-nums">{formatShortDate(row.monitoring.lastAdvisoryDate)}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.monitoring.status} size="sm" />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Reporte de seguimiento"
        description={
          periods.length === 0
            ? "Sin periodo activo configurado"
            : periods
                .map((p) => `${p.program.code} ${p.name} · cierra el ${formatShortDate(p.endDate)}`)
                .join(" · ")
        }
        actions={
          <Link href="/api/reportes/seguimiento" className={buttonVariants({ variant: "secondary" })}>
            <Download className="size-4" aria-hidden="true" />
            Descargar CSV
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={list.allRows}
          getKey={(row) => row.thesisId}
          caption="Reporte de seguimiento por periodo"
          empty={<EmptyState title="No hay trabajos en el alcance seleccionado" />}
        />
      </Card>

      <p className="mt-4 text-sm text-ink-soft">
        El reporte cuenta únicamente asesorías confirmadas como realizadas dentro del periodo activo
        de cada programa. Las programadas no suman.
      </p>
    </>
  );
}
