"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormError, SelectInput, TextInput, TextareaInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { scheduleAdvisoryAction } from "@/app/(app)/asesorias/actions";

export function ScheduleAdvisoryButton({
  thesisId,
  compact = false,
}: {
  thesisId: string;
  compact?: boolean;
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
      const result = await scheduleAdvisoryAction({
        thesisId,
        scheduledDate: String(form.get("scheduledDate") ?? ""),
        scheduledTime: String(form.get("scheduledTime") ?? ""),
        mode: String(form.get("mode") ?? "IN_PERSON"),
        topic: String(form.get("topic") ?? ""),
        observations: String(form.get("observations") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.show(result.message ?? "Asesoría programada.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size={compact ? "sm" : "md"}
        variant={compact ? "secondary" : "primary"}
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="size-4" aria-hidden="true" />
        Programar asesoría
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Programar asesoría"
        description="Queda en estado programada; todavía no cuenta para el mínimo del periodo."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Fecha"
              name="scheduledDate"
              type="date"
              required
              error={fieldErrors.scheduledDate?.[0]}
            />
            <TextInput label="Hora" name="scheduledTime" type="time" error={fieldErrors.scheduledTime?.[0]} />
          </div>
          <SelectInput label="Modalidad" name="mode" defaultValue="IN_PERSON">
            <option value="IN_PERSON">Presencial</option>
            <option value="VIRTUAL">Virtual</option>
            <option value="HYBRID">Híbrida</option>
          </SelectInput>
          <TextInput
            label="Tema o propósito"
            name="topic"
            required
            placeholder="Ej. Revisión del capítulo metodológico"
            error={fieldErrors.topic?.[0]}
          />
          <TextareaInput label="Observaciones" name="observations" hint="Opcional." />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Programar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
