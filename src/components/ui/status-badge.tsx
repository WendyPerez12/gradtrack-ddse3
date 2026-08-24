import { AlertTriangle, CircleAlert, CircleCheck } from "lucide-react";
import type { MonitoringStatus } from "@/modules/monitoring/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<MonitoringStatus, { label: string; className: string; Icon: typeof CircleCheck }> = {
  ON_TRACK: { label: "Al día", className: "bg-ok-soft text-ok", Icon: CircleCheck },
  FOLLOW_UP: { label: "Seguimiento", className: "bg-warn-soft text-warn", Icon: AlertTriangle },
  ALERT: { label: "Alerta", className: "bg-risk-soft text-risk", Icon: CircleAlert },
};

/**
 * Semáforo de seguimiento. Nunca comunica por color solamente: siempre
 * acompaña un icono con forma distinta y la etiqueta en texto (§48).
 */
export function StatusBadge({
  status,
  className,
  size = "md",
}: {
  status: MonitoringStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const { label, className: tone, Icon } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} />
      {label}
    </span>
  );
}

const SEVERITY_STYLE = {
  INFO: { label: "Informativa", className: "bg-brand-soft text-brand" },
  WARNING: { label: "Advertencia", className: "bg-warn-soft text-warn" },
  CRITICAL: { label: "Crítica", className: "bg-risk-soft text-risk" },
} as const;

export function AlertBadge({
  severity,
  className,
}: {
  severity: keyof typeof SEVERITY_STYLE;
  className?: string;
}) {
  const { label, className: tone } = SEVERITY_STYLE[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

const ADVISORY_TONE: Record<string, string> = {
  SCHEDULED: "bg-brand-soft text-brand",
  COMPLETED: "bg-ok-soft text-ok",
  NOT_COMPLETED: "bg-risk-soft text-risk",
  CANCELLED: "bg-surface-muted text-ink-soft",
  RESCHEDULED: "bg-warn-soft text-warn",
};

export function AdvisoryStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        ADVISORY_TONE[status] ?? "bg-surface-muted text-ink-soft",
      )}
    >
      {label}
    </span>
  );
}
