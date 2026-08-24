import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { AlertBadge } from "@/components/ui/status-badge";
import { AlertActions } from "@/components/alerts/alert-actions";
import { RecalculateAlertsButton } from "@/components/alerts/recalculate-button";
import { formatShortDate } from "@/lib/dates";
import { requireActor } from "@/lib/auth/session";
import { thesisScopeWhere } from "@/lib/permissions/guards";
import { listAlerts } from "@/modules/alerts/alert-service";
import { ALERT_TYPE_LABEL } from "@/modules/monitoring/monitoring";
import { ALERT_STATUSES, pickEnumOr } from "@/lib/validations/search-params";

export const metadata: Metadata = { title: "Alertas" };

const FILTERS = [
  ["ACTIVE", "Activas"],
  ["RESOLVED", "Gestionadas"],
  ["DISMISSED", "Descartadas"],
] as const;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const actor = await requireActor();
  const params = await searchParams;
  const status = pickEnumOr(params.estado, ALERT_STATUSES, "ACTIVE");

  const alerts = await listAlerts(thesisScopeWhere(actor), { status });

  return (
    <>
      <PageHeader
        title="Alertas tempranas"
        description="Se generan a partir de las reglas del programa. Al gestionarlas no se borran: quedan en el histórico con su nota."
        actions={<RecalculateAlertsButton />}
      />

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrar alertas">
        {FILTERS.map(([value, label]) => {
          const active = status === value;
          return (
            <Link
              key={value}
              href={`/alertas?estado=${value}`}
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

      <Card>
        {alerts.length === 0 ? (
          <EmptyState
            title={status === "ACTIVE" ? "Sin alertas activas" : "Nada en este filtro"}
            description={
              status === "ACTIVE"
                ? "Ningún trabajo de tu alcance supera los umbrales configurados."
                : "Cambia el filtro para ver otras alertas."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((alert) => (
              <li key={alert.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/trabajos/${alert.thesis.id}`}
                        className="text-sm font-semibold text-ink hover:text-brand"
                      >
                        {alert.thesis.student.user.name}
                      </Link>
                      <AlertBadge severity={alert.severity} />
                      <span className="text-xs text-ink-faint">{ALERT_TYPE_LABEL[alert.type]}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{alert.message}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {alert.thesis.student.studentCode}
                      {alert.thesis.supervisions[0]
                        ? ` · director: ${alert.thesis.supervisions[0].user.name}`
                        : " · sin director"}
                      {" · detectada el "}
                      {formatShortDate(alert.detectedAt)}
                      {alert.status !== "ACTIVE" && alert.resolvedAt
                        ? ` · cerrada el ${formatShortDate(alert.resolvedAt)}${
                            alert.resolvedBy ? ` por ${alert.resolvedBy.name}` : " automáticamente"
                          }`
                        : ""}
                    </p>
                    {alert.metadata && typeof alert.metadata === "object" && "nota" in alert.metadata ? (
                      <p className="mt-2 rounded-md bg-surface-muted px-3 py-2 text-sm text-ink-soft">
                        {String((alert.metadata as Record<string, unknown>).nota)}
                      </p>
                    ) : null}
                  </div>
                  {alert.status === "ACTIVE" ? <AlertActions alertId={alert.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
