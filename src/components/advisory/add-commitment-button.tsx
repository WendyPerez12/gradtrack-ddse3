"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormError, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { addCommitmentAction } from "@/app/(app)/asesorias/actions";

/**
 * Agrega un compromiso a una asesoría ya registrada: los acuerdos aparecen
 * después de la reunión con más frecuencia de la que uno quisiera.
 */
export function AddCommitmentButton({ advisoryId }: { advisoryId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await addCommitmentAction({
        advisoryId,
        description: String(form.get("description") ?? ""),
        dueDate: String(form.get("dueDate") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.show(result.message ?? "Compromiso registrado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Compromiso
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Agregar compromiso"
        description="Queda asociado a esta asesoría y visible para el estudiante."
        width="sm"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <TextInput
            label="Compromiso"
            name="description"
            required
            placeholder="Ej. Entregar el capítulo 3 corregido"
            error={fieldErrors.description?.[0]}
          />
          <TextInput
            label="Fecha límite"
            name="dueDate"
            type="date"
            hint="Opcional."
            error={fieldErrors.dueDate?.[0]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Agregar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
