"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CheckboxInput, FormError, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { activatePeriodAction, createPeriodAction } from "@/app/(app)/configuracion/actions";

interface PeriodRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planeado",
  ACTIVE: "Activo",
  CLOSED: "Cerrado",
};

export function PeriodList({ programId, periods }: { programId: string; periods: PeriodRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const format = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createPeriodAction({
        programId,
        name: String(form.get("name") ?? ""),
        startDate: String(form.get("startDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        advisoryDeadline: String(form.get("advisoryDeadline") ?? ""),
        activate: form.get("activate") === "on",
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.show(result.message ?? "Periodo creado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">Periodos académicos</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Nuevo periodo
        </Button>
      </div>
      {periods.length === 0 ? (
        <p className="text-sm text-ink-soft">Este programa aún no tiene periodos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {periods.map((period) => (
            <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">
                  {period.name}
                  {period.active ? <span className="ml-2 text-xs text-ok">· activo</span> : null}
                </p>
                <p className="text-xs text-ink-faint">
                  {format(period.startDate)} — {format(period.endDate)} · {STATUS_LABEL[period.status]}
                </p>
              </div>
              {!period.active ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await activatePeriodAction({ periodId: period.id, programId });
                      toast.show(
                        result.ok ? (result.message ?? "Periodo activado.") : result.error,
                        result.ok ? "success" : "error",
                      );
                      router.refresh();
                    })
                  }
                >
                  Activar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-faint">
        El periodo activo define qué asesorías cuentan para el mínimo y desde cuándo se miden las alertas.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo periodo académico"
        description="Al abrir el semestre siguiente, las asesorías nuevas empiezan a contar contra él."
        width="sm"
      >
        <form onSubmit={onCreate} className="flex flex-col gap-4">
          <FormError message={error} />
          <TextInput
            label="Nombre"
            name="name"
            required
            placeholder="2027-1"
            hint="Como lo nombra el programa."
            error={fieldErrors.name?.[0]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Fecha de inicio"
              name="startDate"
              type="date"
              required
              error={fieldErrors.startDate?.[0]}
            />
            <TextInput
              label="Fecha de cierre"
              name="endDate"
              type="date"
              required
              error={fieldErrors.endDate?.[0]}
            />
          </div>
          <TextInput
            label="Fecha límite de asesorías"
            name="advisoryDeadline"
            type="date"
            hint="Opcional. Si se deja vacía se usa la fecha de cierre."
            error={fieldErrors.advisoryDeadline?.[0]}
          />
          <CheckboxInput label="Activarlo ahora (cierra el periodo vigente)" name="activate" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Crear periodo"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
