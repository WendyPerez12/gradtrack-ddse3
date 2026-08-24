import type { ReactNode } from "react";
import { Inbox, Loader2, TriangleAlert } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="text-ink-faint" aria-hidden="true">
        {icon ?? <Inbox className="size-7" />}
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-ink-soft" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = "No pudimos cargar esta información",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <TriangleAlert className="size-7 text-risk" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
