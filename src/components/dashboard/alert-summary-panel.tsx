import Link from "next/link";
import { AlertBadge } from "@/components/ui/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatShortDate } from "@/lib/dates";
import { ALERT_TYPE_LABEL } from "@/modules/monitoring/monitoring";
import type { AlertTypeValue } from "@/modules/monitoring/types";

export interface AlertSummaryItem {
  id: string;
  thesisId: string;
  type: AlertTypeValue;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  detectedAt: Date;
  studentName: string;
  directorName: string | null;
  managed: boolean;
  managementNote: string | null;
}

export function AlertSummaryPanel({ alerts }: { alerts: AlertSummaryItem[] }) {
  const sinGestionar = alerts.filter((alert) => !alert.managed).length;

  return (
    <Card>
      <CardHeader
        title="Alertas tempranas"
        description={
          alerts.length === 0
            ? "Ninguna activa"
            : `${alerts.length} activas · ${sinGestionar} sin gestionar`
        }
        action={
          <Link href="/alertas" className="text-sm font-medium text-brand hover:underline">
            Ver todas
          </Link>
        }
      />
      {alerts.length === 0 ? (
        <EmptyState
          title="Sin alertas activas"
          description="Ningún trabajo supera los umbrales configurados para el programa."
        />
      ) : (
        <ul className="divide-y divide-border">
          {alerts.slice(0, 6).map((alert) => (
            <li key={alert.id}>
              <Link href={`/trabajos/${alert.thesisId}`} className="block px-5 py-3.5 hover:bg-surface-muted">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{alert.studentName}</p>
                  <span className="flex items-center gap-1.5">
                    {alert.managed ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-soft">
                        En seguimiento
                      </span>
                    ) : null}
                    <AlertBadge severity={alert.severity} />
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{alert.message}</p>
                {alert.managementNote ? (
                  <p className="mt-1.5 border-l-2 border-border-strong pl-2 text-xs text-ink-soft">
                    {alert.managementNote}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-ink-faint">
                  {ALERT_TYPE_LABEL[alert.type]} · detectada el {formatShortDate(alert.detectedAt)}
                  {alert.directorName ? ` · director: ${alert.directorName}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {alerts.length > 6 ? (
        <CardBody className="border-t border-border text-sm text-ink-soft">
          y {alerts.length - 6} alertas más en la bandeja.
        </CardBody>
      ) : null}
    </Card>
  );
}
