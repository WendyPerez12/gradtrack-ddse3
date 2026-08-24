"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "primary",
  onConfirm,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title} width="sm">
        <p className="text-sm text-ink-soft">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
