"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CheckboxInput, FormError, SelectInput, TextInput, TextareaInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  cancelAdvisoryAction,
  completeAdvisoryAction,
  markNotCompletedAction,
  rescheduleAdvisoryAction,
} from "@/app/(app)/asesorias/actions";

interface AdvisorySummary {
  id: string;
  status: string;
  scheduledDate: string;
  topic: string;
  mode: string;
}

type Dialog = "complete" | "notCompleted" | "reschedule" | null;

const today = () => new Date().toISOString().slice(0, 10);

/** Acciones sobre una asesoría. Los permisos ya vienen resueltos del servidor. */
export function AdvisoryActions({
  advisory,
  hasCodirector,
  canManage,
  canConfirm,
}: {
  advisory: AdvisorySummary;
  hasCodirector: boolean;
  canManage: boolean;
  canConfirm: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const [commitments, setCommitments] = useState<string[]>([""]);

  const open = advisory.status === "SCHEDULED";
  if (!open || (!canManage && !canConfirm)) return null;

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }>) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "No se pudo completar la operación.");
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.show(result.message ?? "Listo.");
      setDialog(null);
      setCommitments([""]);
      router.refresh();
    });
  }

  function onComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() =>
      completeAdvisoryAction({
        advisoryId: advisory.id,
        actualDate: String(form.get("actualDate") ?? ""),
        mode: String(form.get("mode") ?? advisory.mode),
        topic: String(form.get("topic") ?? ""),
        summary: String(form.get("summary") ?? ""),
        observations: String(form.get("observations") ?? ""),
        studentAttended: form.get("studentAttended") === "on",
        directorAttended: form.get("directorAttended") === "on",
        codirectorAttended: hasCodirector ? form.get("codirectorAttended") === "on" : undefined,
        commitments: commitments
          .map((description) => description.trim())
          .filter(Boolean)
          .map((description) => ({ description })),
        nextAdvisoryDate: String(form.get("nextAdvisoryDate") ?? ""),
        createNextAdvisory: form.get("createNextAdvisory") === "on",
        nextAdvisoryTopic: String(form.get("nextAdvisoryTopic") ?? ""),
      }),
    );
  }

  function onNotCompleted(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() =>
      markNotCompletedAction({
        advisoryId: advisory.id,
        reason: String(form.get("reason") ?? "OTHER"),
        observations: String(form.get("observations") ?? ""),
        rescheduleDate: String(form.get("rescheduleDate") ?? ""),
      }),
    );
  }

  function onReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() =>
      rescheduleAdvisoryAction({
        advisoryId: advisory.id,
        newDate: String(form.get("newDate") ?? ""),
        newTime: String(form.get("newTime") ?? ""),
        reason: String(form.get("reason") ?? ""),
      }),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canConfirm ? (
        <Button type="button" size="sm" onClick={() => setDialog("complete")}>
          Marcar realizada
        </Button>
      ) : null}
      {canConfirm ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => setDialog("notCompleted")}>
          No se realizó
        </Button>
      ) : null}
      {canManage ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setDialog("reschedule")}>
          Reprogramar
        </Button>
      ) : null}
      {canManage ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => cancelAdvisoryAction({ advisoryId: advisory.id }))}
        >
          Cancelar
        </Button>
      ) : null}

      {/* --- Confirmar realizada --- */}
      <Modal
        open={dialog === "complete"}
        onClose={() => setDialog(null)}
        title="Registrar asesoría realizada"
        description={`Programada para el ${advisory.scheduledDate}`}
        width="lg"
      >
        <form onSubmit={onComplete} className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Fecha real"
              name="actualDate"
              type="date"
              defaultValue={today()}
              required
              error={fieldErrors.actualDate?.[0]}
            />
            <SelectInput label="Modalidad" name="mode" defaultValue={advisory.mode}>
              <option value="IN_PERSON">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="HYBRID">Híbrida</option>
            </SelectInput>
          </div>

          <fieldset className="rounded-md border border-border px-3 py-2.5">
            <legend className="px-1 text-xs font-medium tracking-wide text-ink-faint uppercase">
              Asistencia
            </legend>
            <div className="flex flex-col gap-2 pt-1">
              <CheckboxInput label="Asistió el estudiante" name="studentAttended" defaultChecked />
              <CheckboxInput label="Asistió el director" name="directorAttended" defaultChecked />
              {hasCodirector ? (
                <CheckboxInput label="Asistió el codirector" name="codirectorAttended" />
              ) : null}
            </div>
          </fieldset>

          <TextInput
            label="Tema tratado"
            name="topic"
            defaultValue={advisory.topic}
            required
            error={fieldErrors.topic?.[0]}
          />
          <TextareaInput label="Resumen de la sesión" name="summary" hint="Opcional." />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">Compromisos</p>
            {commitments.map((value, index) => (
              <input
                key={index}
                value={value}
                onChange={(event) => {
                  const next = [...commitments];
                  next[index] = event.target.value;
                  setCommitments(next);
                }}
                placeholder={`Compromiso ${index + 1}`}
                aria-label={`Compromiso ${index + 1}`}
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
              />
            ))}
            <button
              type="button"
              onClick={() => setCommitments([...commitments, ""])}
              className="self-start text-sm font-medium text-brand hover:underline"
            >
              + Agregar otro compromiso
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Próxima asesoría"
              name="nextAdvisoryDate"
              type="date"
              hint="Déjala en blanco si aún no hay acuerdo."
              error={fieldErrors.nextAdvisoryDate?.[0]}
            />
            <TextInput label="Tema de la próxima" name="nextAdvisoryTopic" />
          </div>
          <CheckboxInput
            label="Crear ya la próxima asesoría programada"
            name="createNextAdvisory"
            defaultChecked
          />

          <TextareaInput label="Observaciones" name="observations" hint="Opcional." />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Registrar asesoría"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- No se realizó --- */}
      <Modal
        open={dialog === "notCompleted"}
        onClose={() => setDialog(null)}
        title="La asesoría no se realizó"
        description="Queda registrada con su motivo; no cuenta para el mínimo del periodo."
      >
        <form onSubmit={onNotCompleted} className="flex flex-col gap-4">
          <FormError message={error} />
          <SelectInput label="Motivo" name="reason" required defaultValue="STUDENT_ABSENT">
            <option value="STUDENT_ABSENT">El estudiante no asistió</option>
            <option value="DIRECTOR_ABSENT">El director no asistió</option>
            <option value="CANCELLED_BY_AGREEMENT">Cancelada de común acuerdo</option>
            <option value="TECHNICAL_ISSUE">Dificultad técnica</option>
            <option value="OTHER">Otro motivo</option>
          </SelectInput>
          <TextareaInput label="Observaciones" name="observations" />
          <TextInput
            label="Reprogramar para"
            name="rescheduleDate"
            type="date"
            hint="Opcional: crea de una vez la nueva asesoría."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Reprogramar --- */}
      <Modal
        open={dialog === "reschedule"}
        onClose={() => setDialog(null)}
        title="Reprogramar asesoría"
        description="La cita original queda como reprogramada y se crea una nueva."
      >
        <form onSubmit={onReschedule} className="flex flex-col gap-4">
          <FormError message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Nueva fecha" name="newDate" type="date" required error={fieldErrors.newDate?.[0]} />
            <TextInput label="Nueva hora" name="newTime" type="time" />
          </div>
          <TextareaInput label="Motivo" name="reason" hint="Opcional." />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Reprogramar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
