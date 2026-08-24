import { CalendarCheck, CircleAlert, CircleCheck, GraduationCap, TriangleAlert, UserX } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { MonitoringSummary } from "@/modules/monitoring/thesis-monitoring";

/** Indicadores superiores del panel (§34). */
export function SummaryCards({ summary }: { summary: MonitoringSummary }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Trabajos activos"
        value={summary.total}
        tone="brand"
        icon={<GraduationCap className="size-4" aria-hidden="true" />}
      />
      <StatCard
        label="Al día"
        value={summary.onTrack}
        tone="ok"
        hint="Sin alertas y con el mínimo en curso"
        icon={<CircleCheck className="size-4" aria-hidden="true" />}
      />
      <StatCard
        label="En seguimiento"
        value={summary.followUp}
        tone="warn"
        hint="Riesgo preventivo"
        icon={<TriangleAlert className="size-4" aria-hidden="true" />}
      />
      <StatCard
        label="En alerta"
        value={summary.alert}
        tone="risk"
        hint="Requieren intervención"
        icon={<CircleAlert className="size-4" aria-hidden="true" />}
      />
      <StatCard
        label="Asesorías del periodo"
        value={summary.completedAdvisories}
        hint={`${summary.scheduledAdvisories} programadas pendientes`}
        icon={<CalendarCheck className="size-4" aria-hidden="true" />}
      />
      <StatCard
        label="Sin director"
        value={summary.withoutDirector}
        tone={summary.withoutDirector > 0 ? "warn" : "neutral"}
        hint="Pendientes de asignación"
        icon={<UserX className="size-4" aria-hidden="true" />}
      />
    </div>
  );
}
