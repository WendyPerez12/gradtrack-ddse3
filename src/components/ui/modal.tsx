"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Diálogo modal sobre el elemento nativo <dialog>: el navegador aporta el
 * atrapado de foco, el cierre con Escape y la semántica de accesibilidad.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const widthClass = width === "sm" ? "max-w-md" : width === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      /* `m-auto` es lo que centra un <dialog> modal: el navegador lo hace con
         `margin: auto`, pero el preflight de Tailwind pone `margin: 0` en todo
         y lo dejaría pegado a la esquina superior izquierda. */
      className={`m-auto w-[calc(100%-2rem)] ${widthClass} rounded-xl border border-border bg-surface p-0 text-ink shadow-xl backdrop:bg-[rgba(15,27,45,0.45)]`}
    >
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold">{title}</h2>
              {description ? <p id={descriptionId} className="mt-0.5 text-sm text-ink-soft">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-ink-faint hover:bg-surface-muted hover:text-ink"
              aria-label="Cerrar"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
