import { cn } from "@/lib/utils";

/**
 * Avance de asesorías del periodo, p. ej. "1 de 2".
 * Muestra siempre el número: las barras son un refuerzo, no la única señal.
 */
export function ProgressIndicator({
  completed,
  required,
  className,
}: {
  completed: number;
  required: number;
  className?: string;
}) {
  const total = Math.max(required, completed);
  const met = completed >= required;
  const bars = Array.from({ length: total }, (_, index) => index < completed);

  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span className="flex gap-0.5" aria-hidden="true">
        {bars.map((filled, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 w-4 rounded-sm",
              filled ? (met ? "bg-ok" : "bg-warn") : "bg-border-strong",
            )}
          />
        ))}
      </span>
      <span className="text-sm tabular-nums text-ink-soft">
        {completed} de {required}
      </span>
    </span>
  );
}
