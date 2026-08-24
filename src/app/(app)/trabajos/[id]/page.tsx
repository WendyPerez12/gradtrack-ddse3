import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { StatusBadge, AlertBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { AdvisoryTimeline } from "@/components/advisory/advisory-timeline";
import { AdvisoryActions } from "@/components/advisory/advisory-actions";
import { ScheduleAdvisoryButton } from "@/components/advisory/schedule-advisory-button";
import { CommitmentControls } from "@/components/advisory/commitment-controls";
import { SupervisionPanel } from "@/components/thesis/supervision-panel";
import { AlertActions } from "@/components/alerts/alert-actions";
import { formatDateTime, formatLongDate, formatShortDate } from "@/lib/dates";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { requireThesisAccess } from "@/lib/permissions/guards";
import {
  canUserConfirmAdvisory,
  canUserManageAdvisories,
  canUserManageThesisAssignment,
} from "@/lib/permissions/rules";
import { ADVISORY_STATUS_LABEL } from "@/lib/validations/advisory";
import { getThesisAuditTrail } from "@/modules/audit/audit-service";
import { ALERT_TYPE_LABEL } from "@/modules/monitoring/monitoring";
import { getMonitoringRow } from "@/modules/monitoring/thesis-monitoring";
import { getThesisDetail } from "@/modules/theses/thesis-service";

export const metadata: Metadata = { title: "Trabajo de grado" };

const AUDIT_LABEL: Record<string, string> = {
  LOGIN: "Inicio de sesión",
  THESIS_CREATED: "Trabajo de grado creado",
  THESIS_UPDATED: "Trabajo actualizado",
  DIRECTOR_ASSIGNED: "Director asignado",
  DIRECTOR_CHANGED: "Cambio de director",
  CODIRECTOR_ASSIGNED: "Codirector asignado",
  CODIRECTOR_REMOVED: "Codirector retirado",
  ADVISORY_CREATED: "Asesoría programada",
  ADVISORY_UPDATED: "Asesoría modificada",
  ADVISORY_COMPLETED: "Asesoría realizada",
  ADVISORY_NOT_COMPLETED: "Asesoría no realizada",
  ADVISORY_CANCELLED: "Asesoría cancelada",
  COMMITMENT_CREATED: "Compromiso registrado",
  COMMITMENT_COMPLETED: "Compromiso actualizado",
  SETTINGS_CHANGED: "Configuración modificada",
  ALERT_RESOLVED: "Alerta gestionada",
  ALERT_DISMISSED: "Alerta descartada",
};

export default async function ThesisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireActor();

  try {
    await requireThesisAccess(actor, id);
  } catch (error) {
    if (error instanceof AppError) notFound();
    throw error;
  }

  const [detail, row] = await Promise.all([getThesisDetail(id), getMonitoringRow(id)]);
  const context = await requireThesisAccess(actor, id);

  const canManage = canUserManageAdvisories(actor, context);
  const canConfirm = canUserConfirmAdvisory(actor, context);
  const canAssign = canUserManageThesisAssignment(actor, detail.programId);

  const relatedIds = [
    ...detail.advisories.map((a) => a.id),
    ...detail.supervisions.map((s) => s.id),
    ...detail.advisories.flatMap((a) => a.commitments.map((c) => c.id)),
  ];

  const [trail, teachers] = await Promise.all([
    getThesisAuditTrail(detail.id, relatedIds),
    canAssign
      ? prisma.user.findMany({
          where: {
            active: true,
            role: { in: ["DIRECTOR", "COORDINADOR"] },
            memberships: { some: { programId: detail.programId } },
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const commitments = detail.advisories.flatMap((advisory) =>
    advisory.commitments.map((commitment) => ({ ...commitment, advisoryDate: advisory.actualDate ?? advisory.scheduledDate })),
  );
  const activeAlerts = detail.alerts.filter((alert) => alert.status === "ACTIVE");
  const pastAlerts = detail.alerts.filter((alert) => alert.status !== "ACTIVE");

  return (
    <>
      <PageHeader
        eyebrow={`${detail.program.name} · ${detail.student.studentCode} · semestre ${detail.student.currentSemester}`}
        title={detail.student.user.name}
        description={detail.title}
        actions={
          canManage ? <ScheduleAdvisoryButton thesisId={detail.id} /> : undefined
        }
      />

      <nav aria-label="Secciones de la ficha" className="mb-5 flex flex-wrap gap-2 text-sm">
        {[
          ["#resumen", "Resumen"],
          ["#asesorias", "Asesorías"],
          ["#compromisos", "Compromisos"],
          ["#alertas", "Alertas"],
          ["#historial", "Historial"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-ink-soft hover:border-brand hover:text-brand"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card id="resumen">
            <CardHeader title="Resumen del trabajo" description={detail.description ?? undefined} />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Estado</dt>
                  <dd className="mt-1">
                    <StatusBadge status={row.monitoring.status} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                    Asesorías del periodo {row.period?.name ?? ""}
                  </dt>
                  <dd className="mt-1">
                    <ProgressIndicator
                      completed={row.monitoring.completedCount}
                      required={row.monitoring.requiredCount}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Cohorte</dt>
                  <dd className="mt-1 text-sm">{detail.student.cohort?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                    Fecha de asignación
                  </dt>
                  <dd className="mt-1 text-sm">{formatLongDate(detail.assignedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                    Última asesoría
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatLongDate(row.monitoring.lastAdvisoryDate)}
                    {row.monitoring.daysSinceLastAdvisory !== null
                      ? ` · hace ${row.monitoring.daysSinceLastAdvisory} días`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                    Próxima asesoría
                  </dt>
                  <dd className="mt-1 text-sm">{formatLongDate(row.monitoring.nextAdvisoryDate)}</dd>
                </div>
              </dl>

              <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-sm text-ink-soft">
                {row.monitoring.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card id="asesorias">
            <CardHeader
              title="Asesorías"
              description={`${detail.advisories.length} registradas en total`}
              action={canManage ? <ScheduleAdvisoryButton thesisId={detail.id} compact /> : undefined}
            />
            {detail.advisories.length === 0 ? (
              <EmptyState
                title="Sin asesorías registradas"
                description="Programa la primera reunión para iniciar el seguimiento."
              />
            ) : (
              <ul className="divide-y divide-border">
                {detail.advisories.map((advisory) => (
                  <li key={advisory.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {formatLongDate(advisory.actualDate ?? advisory.scheduledDate)}
                          {advisory.scheduledTime ? ` · ${advisory.scheduledTime}` : ""}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-soft">{advisory.topic}</p>
                        {advisory.summary ? (
                          <p className="mt-1 text-sm text-ink-soft">{advisory.summary}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-faint">
                          {ADVISORY_STATUS_LABEL[advisory.status]} · periodo {advisory.period.name}
                          {advisory.confirmedBy ? ` · confirmada por ${advisory.confirmedBy.name}` : ""}
                        </p>
                        {advisory.attendances.length > 0 ? (
                          <p className="mt-1 text-xs text-ink-faint">
                            Asistencia:{" "}
                            {advisory.attendances
                              .map((a) => `${a.user.name} ${a.attended ? "sí" : "no"}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <AdvisoryActions
                        advisory={{
                          id: advisory.id,
                          status: advisory.status,
                          scheduledDate: formatShortDate(advisory.scheduledDate),
                          topic: advisory.topic,
                          mode: advisory.mode,
                        }}
                        hasCodirector={Boolean(row.codirector)}
                        canManage={canManage}
                        canConfirm={canConfirm}
                      />
                    </div>

                    {advisory.commitments.length > 0 ? (
                      <ul className="mt-3 flex flex-col gap-1.5 border-l-2 border-border pl-3">
                        {advisory.commitments.map((commitment) => (
                          <li key={commitment.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <span
                              className={
                                commitment.status === "COMPLETED"
                                  ? "text-ink-faint line-through"
                                  : "text-ink-soft"
                              }
                            >
                              {commitment.description}
                            </span>
                            {commitment.dueDate ? (
                              <span className="text-xs text-ink-faint">
                                vence {formatShortDate(commitment.dueDate)}
                              </span>
                            ) : null}
                            {canManage ? (
                              <CommitmentControls
                                commitmentId={commitment.id}
                                status={commitment.status}
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="compromisos">
            <CardHeader
              title="Compromisos"
              description={`${commitments.filter((c) => c.status === "PENDING").length} pendientes de ${commitments.length}`}
            />
            {commitments.length === 0 ? (
              <EmptyState
                title="Sin compromisos registrados"
                description="Los compromisos se registran al confirmar una asesoría."
              />
            ) : (
              <ul className="divide-y divide-border">
                {commitments.map((commitment) => (
                  <li key={commitment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p
                        className={
                          commitment.status === "COMPLETED"
                            ? "text-sm text-ink-faint line-through"
                            : "text-sm text-ink"
                        }
                      >
                        {commitment.description}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        De la asesoría del {formatShortDate(commitment.advisoryDate)}
                        {commitment.dueDate ? ` · vence ${formatShortDate(commitment.dueDate)}` : ""}
                        {commitment.responsible ? ` · ${commitment.responsible.name}` : ""}
                      </p>
                    </div>
                    {canManage ? (
                      <CommitmentControls commitmentId={commitment.id} status={commitment.status} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="historial">
            <CardHeader title="Historial" description="Trazabilidad completa del trabajo." />
            {trail.length === 0 ? (
              <EmptyState title="Sin eventos registrados" />
            ) : (
              <ul className="divide-y divide-border">
                {trail.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <p className="text-sm text-ink">{AUDIT_LABEL[entry.action] ?? entry.action}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {formatDateTime(entry.createdAt)}
                      {entry.user ? ` · ${entry.user.name}` : " · sistema"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <SupervisionPanel
            thesisId={detail.id}
            canAssign={canAssign}
            teachers={teachers}
            supervisions={detail.supervisions.map((supervision) => ({
              id: supervision.id,
              type: supervision.type,
              active: supervision.active,
              name: supervision.user.name,
              email: supervision.user.email,
              startedAt: formatShortDate(supervision.startedAt),
              endedAt: supervision.endedAt ? formatShortDate(supervision.endedAt) : null,
            }))}
          />

          <Card id="alertas">
            <CardHeader title="Alertas" description={`${activeAlerts.length} activas`} />
            {detail.alerts.length === 0 ? (
              <CardBody className="text-sm text-ink-soft">
                Este trabajo no ha generado alertas.
              </CardBody>
            ) : (
              <ul className="divide-y divide-border">
                {[...activeAlerts, ...pastAlerts].map((alert) => (
                  <li key={alert.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{ALERT_TYPE_LABEL[alert.type]}</p>
                      <AlertBadge severity={alert.severity} />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{alert.message}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Detectada el {formatShortDate(alert.detectedAt)}
                      {alert.status !== "ACTIVE"
                        ? ` · ${alert.status === "RESOLVED" ? "gestionada" : "descartada"} el ${formatShortDate(alert.resolvedAt)}`
                        : ""}
                    </p>
                    {alert.status === "ACTIVE" && canManage ? (
                      <div className="mt-2">
                        <AlertActions alertId={alert.id} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Línea de tiempo" />
            <CardBody>
              <AdvisoryTimeline advisories={detail.advisories.slice(0, 6)} />
              {detail.advisories.length > 6 ? (
                <p className="mt-3 text-xs text-ink-faint">
                  Mostrando las 6 asesorías más recientes.
                </p>
              ) : null}
            </CardBody>
          </Card>

          <Link href="/trabajos" className="text-sm font-medium text-brand hover:underline">
            ← Volver al listado
          </Link>
        </div>
      </div>
    </>
  );
}
