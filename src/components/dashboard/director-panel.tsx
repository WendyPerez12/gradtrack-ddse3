import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/states";
import { ThesisTable } from "@/components/thesis/thesis-table";
import { AdvisoryStatusBadge } from "@/components/ui/status-badge";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/permissions/rules";
import { ADVISORY_STATUS_LABEL } from "@/lib/validations/advisory";
import { makeHrefBuilder, queryThesisList, type ThesisListParams } from "@/modules/theses/thesis-query";

/** Panel del director (§37, §85): con quién debo reunirme y qué quedó pendiente. */
export async function DirectorPanel({ actor, params }: { actor: Actor; params: ThesisListParams }) {
  const list = await queryThesisList(actor, params);
  const href = makeHrefBuilder("/panel", params);

  const [upcoming, pendingCommitments] = await Promise.all([
    prisma.advisory.findMany({
      where: {
        status: "SCHEDULED",
        thesis: { supervisions: { some: { userId: actor.id, active: true } } },
      },
      include: {
        thesis: { select: { id: true, student: { select: { user: { select: { name: true } } } } } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 6,
    }),
    prisma.advisoryCommitment.findMany({
      where: {
        status: "PENDING",
        advisory: { thesis: { supervisions: { some: { userId: actor.id, active: true } } } },
      },
      include: {
        advisory: {
          select: {
            thesisId: true,
            thesis: { select: { student: { select: { user: { select: { name: true } } } } } },
          },
        },
      },
      orderBy: [{ dueDate: "asc" }],
      take: 6,
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Mis trabajos dirigidos"
        title="Panel del director"
        description="Confirma la asesoría cuando ocurra y deja acordada la siguiente fecha. Eso es todo lo que el seguimiento necesita."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Trabajos asignados" value={list.summary.total} tone="brand" />
        <StatCard label="Al día" value={list.summary.onTrack} tone="ok" />
        <StatCard label="En seguimiento" value={list.summary.followUp} tone="warn" />
        <StatCard label="En alerta" value={list.summary.alert} tone="risk" />
      </div>

      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden">
          <CardHeader title="Estudiantes que dirijo" description="Ordena por cualquier columna." />
          <ThesisTable
            rows={list.rows}
            sort={list.sort}
            dir={list.dir}
            hrefForSort={(key) => href.forSort(key, { sort: list.sort, dir: list.dir })}
            hrefForPage={href.forPage}
            page={list.page}
            pages={list.pages}
            total={list.total}
            emptyTitle="Todavía no tienes trabajos asignados"
            emptyDescription="La coordinación del programa asigna la dirección de los trabajos de grado."
          />
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Próximas asesorías" />
            {upcoming.length === 0 ? (
              <EmptyState
                title="Sin asesorías programadas"
                description="Programa la próxima reunión desde el trabajo de grado."
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((advisory) => (
                  <li key={advisory.id}>
                    <Link
                      href={`/trabajos/${advisory.thesis.id}`}
                      className="block px-5 py-3 hover:bg-surface-muted"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{advisory.thesis.student.user.name}</p>
                        <AdvisoryStatusBadge
                          status={advisory.status}
                          label={ADVISORY_STATUS_LABEL[advisory.status] ?? advisory.status}
                        />
                      </div>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {formatLongDate(advisory.scheduledDate)}
                        {advisory.scheduledTime ? ` · ${advisory.scheduledTime}` : ""}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{advisory.topic}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Compromisos pendientes" />
            {pendingCommitments.length === 0 ? (
              <CardBody className="text-sm text-ink-soft">
                No hay compromisos pendientes registrados.
              </CardBody>
            ) : (
              <ul className="divide-y divide-border">
                {pendingCommitments.map((commitment) => (
                  <li key={commitment.id} className="px-5 py-3">
                    <p className="text-sm">{commitment.description}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {commitment.advisory.thesis.student.user.name}
                      {commitment.dueDate ? ` · vence ${formatShortDate(commitment.dueDate)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
