"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormError, SelectInput, TextareaInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { assignSupervisorAction, removeSupervisorAction } from "@/app/(app)/trabajos/actions";

interface SupervisionRow {
  id: string;
  type: string;
  active: boolean;
  name: string;
  email: string;
  startedAt: string;
  endedAt: string | null;
}

/** Equipo de acompañamiento con su histórico completo (§19, §72). */
export function SupervisionPanel({
  thesisId,
  supervisions,
  teachers,
  canAssign,
}: {
  thesisId: string;
  supervisions: SupervisionRow[];
  teachers: Array<{ id: string; name: string }>;
  canAssign: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"DIRECTOR" | "CODIRECTOR" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = supervisions.filter((s) => s.active);
  const history = supervisions.filter((s) => !s.active);
  const director = active.find((s) => s.type === "DIRECTOR") ?? null;
  const codirector = active.find((s) => s.type === "CODIRECTOR") ?? null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = dialog;
    setError(null);
    startTransition(async () => {
      const result = await assignSupervisorAction({
        thesisId,
        userId: String(form.get("userId") ?? ""),
        type,
        reason: String(form.get("reason") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.show(result.message ?? "Asignación registrada.");
      setDialog(null);
      router.refresh();
    });
  }

  function remove(supervisionId: string) {
    startTransition(async () => {
      const result = await removeSupervisorAction({ thesisId, supervisionId, reason: "" });
      if (!result.ok) {
        toast.show(result.error, "error");
        return;
      }
      toast.show(result.message ?? "Codirector retirado.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader title="Equipo de acompañamiento" />
      <CardBody className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">Director</p>
          {director ? (
            <>
              <p className="mt-0.5 text-sm font-medium">{director.name}</p>
              <p className="text-xs text-ink-faint">
                {director.email} · desde {director.startedAt}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-warn">Sin asignar</p>
          )}
          {canAssign ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => setDialog("DIRECTOR")}
            >
              {director ? "Cambiar director" : "Asignar director"}
            </Button>
          ) : null}
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">Codirector</p>
          {codirector ? (
            <>
              <p className="mt-0.5 text-sm font-medium">{codirector.name}</p>
              <p className="text-xs text-ink-faint">
                {codirector.email} · desde {codirector.startedAt}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-ink-soft">No aplica</p>
          )}
          {canAssign ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setDialog("CODIRECTOR")}>
                {codirector ? "Cambiar codirector" : "Asignar codirector"}
              </Button>
              {codirector ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(codirector.id)}
                >
                  Retirar
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {history.length > 0 ? (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              Asignaciones anteriores
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {history.map((row) => (
                <li key={row.id} className="text-sm text-ink-soft">
                  {row.name}
                  <span className="text-xs text-ink-faint">
                    {" "}
                    · {row.type === "DIRECTOR" ? "director" : "codirector"} · {row.startedAt} a{" "}
                    {row.endedAt ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "CODIRECTOR" ? "Asignar codirector" : "Asignar director"}
        description="La asignación anterior se cierra con su fecha y queda en el histórico."
        width="sm"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <FormError message={error} />
          <SelectInput label="Docente" name="userId" required defaultValue="">
            <option value="">Selecciona un docente…</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </SelectInput>
          <TextareaInput label="Motivo del cambio" name="reason" hint="Opcional, queda en la auditoría." />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Asignar"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
