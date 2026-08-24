import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONE = {
  neutral: "text-ink",
  brand: "text-brand",
  ok: "text-ok",
  warn: "text-warn",
  risk: "text-risk",
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof TONE;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn("mt-1.5 text-3xl leading-none font-semibold tabular-nums", TONE[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}
