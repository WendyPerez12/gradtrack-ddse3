import { CalendarClock, CircleCheck, CircleX, RefreshCw, Ban } from "lucide-react";
import { AdvisoryStatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/states";
import { formatLongDate } from "@/lib/dates";
import {
  ADVISORY_MODE_LABEL,
  ADVISORY_STATUS_LABEL,
  COMMITMENT_STATUS_LABEL,
  NOT_COMPLETED_REASON_LABEL,
} from "@/lib/validations/advisory";

interface TimelineCommitment {
  id: string;
  description: string;
  status: string;
  dueDate: Date | null;
}

export interface TimelineAdvisory {
  id: string;
  status: string;
  scheduledDate: Date;
  actualDate: Date | null;
  scheduledTime: string | null;
  mode: string;
  topic: string;
  summary: string | null;
  observations: string | null;
  notCompletedReason: string | null;
  nextAdvisoryDate: Date | null;
  confirmedBy?: { name: string } | null;
  commitments: TimelineCommitment[];
}

const ICONS: Record<string, typeof CircleCheck> = {
  COMPLETED: CircleCheck,
  SCHEDULED: CalendarClock,
  NOT_COMPLETED: CircleX,
  RESCHEDULED: RefreshCw,
  CANCELLED: Ban,
};

const TONE: Record<string, string> = {
  COMPLETED: "text-ok",
  SCHEDULED: "text-brand",
  NOT_COMPLETED: "text-risk",
  RESCHEDULED: "text-warn",
  CANCELLED: "text-ink-faint",
};

/** Línea de tiempo de asesorías, compartida por la vista del estudiante y la ficha. */
export function AdvisoryTimeline({ advisories }: { advisories: TimelineAdvisory[] }) {
  if (advisories.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay asesorías registradas"
        description="Cuando se programe la primera reunión aparecerá aquí."
      />
    );
  }

  return (
    <ol className="flex flex-col">
      {advisories.map((advisory, index) => {
        const Icon = ICONS[advisory.status] ?? CalendarClock;
        const date = advisory.actualDate ?? advisory.scheduledDate;
        const last = index === advisories.length - 1;

        return (
          <li key={advisory.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span className="absolute top-6 bottom-0 left-2.5 w-px bg-border" aria-hidden="true" />
            ) : null}
            <span className={`relative mt-0.5 ${TONE[advisory.status] ?? "text-ink-faint"}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-ink">{formatLongDate(date)}</p>
                <AdvisoryStatusBadge
                  status={advisory.status}
                  label={ADVISORY_STATUS_LABEL[advisory.status] ?? advisory.status}
                />
                <span className="text-xs text-ink-faint">
                  {ADVISORY_MODE_LABEL[advisory.mode] ?? advisory.mode}
                  {advisory.scheduledTime ? ` · ${advisory.scheduledTime}` : ""}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-ink">{advisory.topic}</p>
              {advisory.summary ? (
                <p className="mt-0.5 text-sm text-ink-soft">{advisory.summary}</p>
              ) : null}
              {advisory.notCompletedReason ? (
                <p className="mt-0.5 text-sm text-risk">
                  {NOT_COMPLETED_REASON_LABEL[advisory.notCompletedReason] ?? advisory.notCompletedReason}
                </p>
              ) : null}
              {advisory.observations ? (
                <p className="mt-0.5 text-sm text-ink-soft italic">{advisory.observations}</p>
              ) : null}
              {advisory.commitments.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {advisory.commitments.map((commitment) => (
                    <li key={commitment.id} className="text-sm text-ink-soft">
                      <span className="text-ink-faint">Compromiso:</span> {commitment.description}
                      <span className="ml-1 text-xs text-ink-faint">
                        ({COMMITMENT_STATUS_LABEL[commitment.status] ?? commitment.status}
                        {commitment.dueDate ? ` · vence ${formatLongDate(commitment.dueDate)}` : ""})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {advisory.nextAdvisoryDate ? (
                <p className="mt-1.5 text-xs text-ink-faint">
                  Próxima asesoría acordada: {formatLongDate(advisory.nextAdvisoryDate)}
                </p>
              ) : null}
              {advisory.confirmedBy ? (
                <p className="mt-1 text-xs text-ink-faint">
                  Confirmada por {advisory.confirmedBy.name}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
