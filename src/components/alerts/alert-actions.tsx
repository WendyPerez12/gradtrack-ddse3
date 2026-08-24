"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextareaInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { dismissAlertAction, manageAlertAction } from "@/app/(app)/alertas/actions";

/**
 * Gestión de una alerta. Resolver no borra: deja la nota de gestión y la
 * alerta pasa al histórico (§33, §74).
 */
export function AlertActions({
  alertId,
  managed = false,
}: {
  alertId: string;
  managed?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<"manage" | "dismiss" | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    const action = open;
    startTransition(async () => {
      const result =
        action === "dismiss"
          ? await dismissAlertAction({ alertId, note })
          : await manageAlertAction({ alertId, note });
      if (!result.ok) {
        toast.show(result.error, "error");
        return;
      }
      toast.show(result.message ?? "Alerta actualizada.");
      setOpen(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen("manage")}>
        {managed ? "Actualizar gestión" : "Registrar gestión"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen("dismiss")}>
        Descartar
      </Button>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open === "dismiss" ? "Descartar alerta" : "Registrar gestión"}
        description={
          open === "dismiss"
            ? "La alerta se archiva como no aplicable y no volverá a levantarse en este periodo."
            : "La alerta seguirá visible, marcada como en seguimiento, hasta que la situación cambie."
        }
        width="sm"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TextareaInput
            label="Nota de gestión"
            name="note"
            required={open === "manage"}
            placeholder="Ej. Hablé con el estudiante y el director; retoman el 12 de septiembre."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
