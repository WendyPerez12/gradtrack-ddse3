import Link from "next/link";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { StatusBadge, ThesisStatusBadge } from "@/components/ui/status-badge";
import { formatShortDate } from "@/lib/dates";
import type { ThesisMonitoringRow } from "@/modules/monitoring/thesis-monitoring";

export type SortKey =
  | "student"
  | "director"
  | "advisories"
  | "lastAdvisory"
  | "nextAdvisory"
  | "daysSince"
  | "status";

const STATUS_ORDER = { ALERT: 0, FOLLOW_UP: 1, ON_TRACK: 2 } as const;

/** Ordenamiento en servidor sobre el estado derivado. */
export function sortRows(
  rows: ThesisMonitoringRow[],
  sort: SortKey,
  dir: "asc" | "desc",
): ThesisMonitoringRow[] {
  const factor = dir === "asc" ? 1 : -1;
  const value = (row: ThesisMonitoringRow): string | number => {
    switch (sort) {
      case "student":
        return row.studentName.toLocaleLowerCase("es");
      case "director":
        return row.director?.name.toLocaleLowerCase("es") ?? "zzz";
      case "advisories":
        return row.monitoring.completedCount;
      case "lastAdvisory":
        return row.monitoring.lastAdvisoryDate?.getTime() ?? 0;
      case "nextAdvisory":
        return row.monitoring.nextAdvisoryDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      case "daysSince":
        return row.monitoring.daysSinceLastAdvisory ?? Number.MAX_SAFE_INTEGER;
      case "status":
      default:
        return STATUS_ORDER[row.monitoring.status];
    }
  };

  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === vb) return a.studentName.localeCompare(b.studentName, "es");
    return va > vb ? factor : -factor;
  });
}

export function ThesisTable({
  rows,
  sort,
  dir,
  hrefForSort,
  page,
  pages,
  total,
  hrefForPage,
  showProgram = false,
  emptyTitle = "No hay trabajos de grado que coincidan",
  emptyDescription = "Ajusta los filtros o crea un nuevo trabajo de grado.",
}: {
  rows: ThesisMonitoringRow[];
  sort: SortKey;
  dir: "asc" | "desc";
  hrefForSort: (key: SortKey) => string;
  page: number;
  pages: number;
  total: number;
  hrefForPage: (page: number) => string;
  showProgram?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const sortedFlag = (key: SortKey) => (sort === key ? dir : null);

  const columns: Column<ThesisMonitoringRow>[] = [
    {
      key: "student",
      header: "Estudiante",
      sortHref: hrefForSort("student"),
      sorted: sortedFlag("student"),
      cell: (row) => (
        <div className="min-w-44">
          <Link href={`/trabajos/${row.thesisId}`} className="font-medium text-ink hover:text-brand">
            {row.studentName}
          </Link>
          <p className="text-xs text-ink-faint">
            {row.studentCode} · semestre {row.studentSemester}
            {row.cohortName ? ` · cohorte ${row.cohortName}` : ""}
          </p>
        </div>
      ),
    },
    ...(showProgram
      ? [
          {
            key: "program",
            header: "Programa",
            cell: (row: ThesisMonitoringRow) => <span className="text-ink-soft">{row.programName}</span>,
          },
        ]
      : []),
    {
      key: "director",
      header: "Director",
      sortHref: hrefForSort("director"),
      sorted: sortedFlag("director"),
      cell: (row) =>
        row.director ? (
          <div className="min-w-36">
            <p>{row.director.name}</p>
            {row.codirector ? (
              <p className="text-xs text-ink-faint">Codirector: {row.codirector.name}</p>
            ) : null}
          </div>
        ) : (
          <span className="text-warn">Sin asignar</span>
        ),
    },
    {
      key: "advisories",
      header: "Asesorías",
      sortHref: hrefForSort("advisories"),
      sorted: sortedFlag("advisories"),
      cell: (row) => (
        <ProgressIndicator
          completed={row.monitoring.completedCount}
          required={row.monitoring.requiredCount}
        />
      ),
    },
    {
      key: "lastAdvisory",
      header: "Última",
      sortHref: hrefForSort("lastAdvisory"),
      sorted: sortedFlag("lastAdvisory"),
      cell: (row) => (
        <span className="tabular-nums whitespace-nowrap text-ink-soft">
          {formatShortDate(row.monitoring.lastAdvisoryDate)}
        </span>
      ),
    },
    {
      key: "nextAdvisory",
      header: "Próxima",
      sortHref: hrefForSort("nextAdvisory"),
      sorted: sortedFlag("nextAdvisory"),
      cell: (row) =>
        row.monitoring.nextAdvisoryDate ? (
          <span className="tabular-nums whitespace-nowrap text-ink-soft">
            {formatShortDate(row.monitoring.nextAdvisoryDate)}
          </span>
        ) : (
          <span className="text-ink-faint">Sin agendar</span>
        ),
    },
    {
      key: "daysSince",
      header: "Días sin asesoría",
      sortHref: hrefForSort("daysSince"),
      sorted: sortedFlag("daysSince"),
      cell: (row) => (
        <span className="tabular-nums text-ink-soft">
          {row.monitoring.daysSinceLastAdvisory ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      sortHref: hrefForSort("status"),
      sorted: sortedFlag("status"),
      cell: (row) =>
        row.status === "ACTIVE" ? (
          <StatusBadge status={row.monitoring.status} size="sm" />
        ) : (
          <ThesisStatusBadge status={row.status} />
        ),
    },
    {
      key: "actions",
      header: "Acciones",
      cell: (row) => (
        <Link href={`/trabajos/${row.thesisId}`} className="text-sm font-medium text-brand hover:underline">
          Ver
        </Link>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        getKey={(row) => row.thesisId}
        caption="Seguimiento de trabajos de grado"
        empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
      <Pagination page={page} pages={pages} total={total} hrefFor={hrefForPage} />
    </>
  );
}
