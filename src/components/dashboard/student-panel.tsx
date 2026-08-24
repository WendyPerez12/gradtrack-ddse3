import Link from "next/link";
import { CalendarClock, CircleCheck } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdvisoryTimeline } from "@/components/advisory/advisory-timeline";
import { formatLongDate } from "@/lib/dates";
import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/permissions/rules";
import { getMonitoringRows } from "@/modules/monitoring/thesis-monitoring";
import { getThesisDetail } from "@/modules/theses/thesis-service";

/** Vista del estudiante (§38, §86). Sencilla y de solo lectura. */
export async function StudentPanel({ actor }: { actor: Actor }) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: actor.id },
    select: { id: true, theses: { where: { status: "ACTIVE" }, select: { id: true } } },
  });

  const thesisId = profile?.theses[0]?.id;

  if (!thesisId) {
    return (
      <>
        <PageHeader title="Mi trabajo de grado" />
        <Card>
          <EmptyState
            title="Todavía no tienes un trabajo de grado asignado"
            description="La coordinación del programa asigna el trabajo y el director al finalizar el primer semestre."
          />
        </Card>
      </>
    );
  }

  const [detail, rows] = await Promise.all([
    getThesisDetail(thesisId),
    getMonitoringRows({ id: thesisId }),
  ]);
  const row = rows[0]!;
  const monitoring = row.monitoring;

  const pendingCommitments = detail.advisories
    .flatMap((advisory) => advisory.commitments)
    .filter((commitment) => commitment.status === "PENDING");

  return (
    <>
      <PageHeader
        eyebrow={`${row.programName} · semestre ${row.studentSemester}${row.cohortName ? ` · cohorte ${row.cohortName}` : ""}`}
        title="Mi trabajo de grado"
        description="Aquí queda constancia de cada asesoría, así la sesión no se haya podido realizar."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title={detail.title} description={detail.description ?? undefined} />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Director</dt>
                  <dd className="mt-0.5 text-sm">
                    {row.director ? row.director.name : "Sin asignar"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Codirector</dt>
                  <dd className="mt-0.5 text-sm">{row.codirector ? row.codirector.name : "No aplica"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                    Fecha de asignación
                  </dt>
                  <dd className="mt-0.5 text-sm">{formatLongDate(detail.assignedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Programa</dt>
                  <dd className="mt-0.5 text-sm">{detail.program.name}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historial de asesorías" description="De la más reciente a la más antigua." />
            <CardBody>
              <AdvisoryTimeline advisories={detail.advisories} />
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title={`Asesorías del periodo ${row.period?.name ?? ""}`} />
            <CardBody className="flex flex-col gap-4">
              <div>
                <p className="text-4xl leading-none font-semibold tabular-nums text-ink">
                  {monitoring.completedCount}
                  <span className="text-2xl text-ink-faint"> de {monitoring.requiredCount}</span>
                </p>
                <div className="mt-2">
                  <ProgressIndicator
                    completed={monitoring.completedCount}
                    required={monitoring.requiredCount}
                  />
                </div>
              </div>

              <StatusBadge status={monitoring.status} />

              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CircleCheck className="size-4 text-ink-faint" aria-hidden="true" />
                  <dt className="text-ink-soft">Última asesoría:</dt>
                  <dd>{formatLongDate(monitoring.lastAdvisoryDate)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-ink-faint" aria-hidden="true" />
                  <dt className="text-ink-soft">Próxima:</dt>
                  <dd>{formatLongDate(monitoring.nextAdvisoryDate)}</dd>
                </div>
              </dl>

              <ul className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm text-ink-soft">
                {monitoring.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              <p className="text-xs text-ink-faint">
                Solo tu director o codirector pueden confirmar que una asesoría se realizó. Si ya se
                reunieron y no aparece registrada, escríbeles.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Compromisos pendientes" description={`${pendingCommitments.length} sin cerrar`} />
            {pendingCommitments.length === 0 ? (
              <CardBody className="text-sm text-ink-soft">No tienes compromisos pendientes.</CardBody>
            ) : (
              <ul className="divide-y divide-border">
                {pendingCommitments.map((commitment) => (
                  <li key={commitment.id} className="px-5 py-3">
                    <p className="text-sm">{commitment.description}</p>
                    {commitment.dueDate ? (
                      <p className="mt-0.5 text-xs text-ink-faint">
                        Vence el {formatLongDate(commitment.dueDate)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Link
            href={`/trabajos/${thesisId}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            Ver la ficha completa del trabajo
          </Link>
        </div>
      </div>
    </>
  );
}
