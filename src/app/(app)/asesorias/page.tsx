import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { AdvisoryStatusBadge } from "@/components/ui/status-badge";
import { formatShortDate } from "@/lib/dates";
import { requireActor } from "@/lib/auth/session";
import { thesisScopeWhere } from "@/lib/permissions/guards";
import { ADVISORY_MODE_LABEL, ADVISORY_STATUS_LABEL } from "@/lib/validations/advisory";
import { listAdvisories } from "@/modules/advisories/advisory-service";
import { ADVISORY_STATUSES, pickEnum } from "@/lib/validations/search-params";

export const metadata: Metadata = { title: "Asesorías" };

type Row = Awaited<ReturnType<typeof listAdvisories>>["items"][number];

const STATUSES = [
  ["", "Todos los estados"],
  ["SCHEDULED", "Programadas"],
  ["COMPLETED", "Realizadas"],
  ["NOT_COMPLETED", "No realizadas"],
  ["RESCHEDULED", "Reprogramadas"],
  ["CANCELLED", "Canceladas"],
] as const;

export default async function AdvisoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string; q?: string }>;
}) {
  const actor = await requireActor();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const estado = pickEnum(params.estado, ADVISORY_STATUSES);

  const result = await listAdvisories(
    {
      thesis: thesisScopeWhere(actor),
      status: estado,
      ...(params.q?.trim()
        ? {
            OR: [
              { topic: { contains: params.q.trim(), mode: "insensitive" as const } },
              { thesis: { title: { contains: params.q.trim(), mode: "insensitive" as const } } },
              {
                thesis: {
                  student: { user: { name: { contains: params.q.trim(), mode: "insensitive" as const } } },
                },
              },
              {
                thesis: {
                  supervisions: {
                    some: { user: { name: { contains: params.q.trim(), mode: "insensitive" as const } } },
                  },
                },
              },
            ],
          }
        : {}),
    },
    { page },
  );

  const hrefFor = (nextPage: number) => {
    const search = new URLSearchParams();
    if (estado) search.set("estado", estado);
    if (params.q) search.set("q", params.q);
    search.set("page", String(nextPage));
    return `/asesorias?${search.toString()}`;
  };

  const hrefForStatus = (value: string) => {
    const search = new URLSearchParams();
    if (value) search.set("estado", value);
    if (params.q) search.set("q", params.q);
    const query = search.toString();
    return query ? `/asesorias?${query}` : "/asesorias";
  };

  const columns: Column<Row>[] = [
    {
      key: "date",
      header: "Fecha",
      cell: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatShortDate(row.actualDate ?? row.scheduledDate)}
          {row.scheduledTime ? <span className="text-ink-faint"> · {row.scheduledTime}</span> : null}
        </span>
      ),
    },
    {
      key: "student",
      header: "Estudiante",
      cell: (row) => (
        <Link href={`/trabajos/${row.thesis.id}`} className="font-medium hover:text-brand">
          {row.thesis.student.user.name}
          <span className="block text-xs font-normal text-ink-faint">{row.thesis.student.studentCode}</span>
        </Link>
      ),
    },
    {
      key: "director",
      header: "Director",
      cell: (row) => (
        <span className="text-ink-soft">{row.thesis.supervisions[0]?.user.name ?? "Sin asignar"}</span>
      ),
    },
    { key: "topic", header: "Tema", cell: (row) => <span className="text-ink-soft">{row.topic}</span> },
    {
      key: "mode",
      header: "Modalidad",
      cell: (row) => <span className="text-ink-soft">{ADVISORY_MODE_LABEL[row.mode]}</span>,
    },
    { key: "period", header: "Periodo", cell: (row) => <span className="text-ink-soft">{row.period.name}</span> },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <AdvisoryStatusBadge status={row.status} label={ADVISORY_STATUS_LABEL[row.status] ?? row.status} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Asesorías"
        description="Todas las sesiones registradas en tu alcance. Solo las realizadas cuentan para el mínimo del periodo."
      />

      <form className="mb-4 max-w-md" role="search">
        <label htmlFor="buscar-asesorias" className="sr-only">
          Buscar por estudiante, director, tema o título
        </label>
        <input
          id="buscar-asesorias"
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Buscar estudiante, director, tema o título…"
          className="h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-sm"
        />
        {estado ? <input type="hidden" name="estado" value={estado} /> : null}
      </form>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrar por estado">
        {STATUSES.map(([value, label]) => {
          const active = (estado ?? "") === value;
          return (
            <Link
              key={value || "todos"}
              href={hrefForStatus(value)}
              className={
                active
                  ? "rounded-full bg-brand px-3 py-1.5 text-sm text-brand-contrast"
                  : "rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-ink-soft hover:border-brand hover:text-brand"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={result.items}
          getKey={(row) => row.id}
          caption="Listado de asesorías"
          empty={
            <EmptyState
              title="No hay asesorías con ese filtro"
              description="Prueba con otro estado o programa una nueva asesoría desde la ficha del trabajo."
            />
          }
        />
        <Pagination page={result.page} pages={result.pages} total={result.total} hrefFor={hrefFor} />
      </Card>
    </>
  );
}
