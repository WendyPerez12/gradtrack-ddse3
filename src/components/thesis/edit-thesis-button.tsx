"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormError, SelectInput, TextInput, TextareaInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { updateThesisAction } from "@/app/(app)/trabajos/actions";

/** Edición de los datos académicos del trabajo (coordinación y administración). */
export function EditThesisButton({
  thesisId,
  title,
  description,
  status,
}: {
  thesisId: string;
  title: string;
  description: string | null;
  status: string;
}) {
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
      const result = await updateThesisAction({
        thesisId,
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        status: String(form.get("status") ?? status),
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.show(result.message ?? "Trabajo actualizado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden="true" />
        Editar trabajo
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar trabajo de grado"
        description="El cambio queda registrado en la auditoría."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <TextInput
            label="Título"
            name="title"
            defaultValue={title}
            required
            error={fieldErrors.title?.[0]}
          />
          <TextareaInput
            label="Descripción"
            name="description"
            defaultValue={description ?? ""}
            hint="Opcional."
          />
          <SelectInput
            label="Estado del trabajo"
            name="status"
            defaultValue={status}
            hint="Suspender o cancelar detiene el seguimiento y sus alertas."
          >
            <option value="ACTIVE">Activo</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="COMPLETED">Terminado</option>
            <option value="CANCELLED">Cancelado</option>
          </SelectInput>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
