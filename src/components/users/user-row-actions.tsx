"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormError, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  UserFormFields,
  readUserForm,
  type CohortOption,
  type ProgramOption,
} from "@/components/users/user-form-fields";
import { suggestTemporaryPassword } from "@/lib/validations/user";
import type { UserListItem } from "@/modules/users/user-service";
import {
  resetPasswordAction,
  setUserActiveAction,
  updateUserAction,
} from "@/app/(app)/usuarios/actions";

type Dialog = "edit" | "password" | "deactivate" | null;

export function UserRowActions({
  user,
  programs,
  cohorts,
}: {
  user: UserListItem;
  programs: ProgramOption[];
  cohorts: CohortOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[]> }>) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "No se pudo completar la operación.");
        setFieldErrors(result.fieldErrors ?? {});
        if (!dialog) toast.show(result.error ?? "No se pudo completar la operación.", "error");
        return;
      }
      toast.show(result.message ?? "Listo.");
      setDialog(null);
      setPassword("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button type="button" size="sm" variant="secondary" onClick={() => setDialog("edit")}>
        Editar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setDialog("password")}>
        Contraseña
      </Button>
      {user.active ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setDialog("deactivate")}>
          Desactivar
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => setUserActiveAction({ userId: user.id, active: true }))}
        >
          Reactivar
        </Button>
      )}

      {/* --- Editar --- */}
      <Modal
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
        title="Editar cuenta"
        description={user.email}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(() => updateUserAction({ userId: user.id, ...readUserForm(form) }));
          }}
          className="flex flex-col gap-4"
        >
          <FormError message={error} />
          <UserFormFields
            programs={programs}
            cohorts={cohorts}
            fieldErrors={fieldErrors}
            lockRole={Boolean(user.studentProfile)}
            defaults={{
              name: user.name,
              email: user.email,
              role: user.role,
              programIds: user.studentProfile
                ? [user.studentProfile.program.id]
                : user.memberships.map((m) => m.program.id),
              studentCode: user.studentProfile?.studentCode,
              cohortId: user.studentProfile?.cohort?.id ?? "",
              currentSemester: user.studentProfile?.currentSemester,
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Contraseña temporal --- */}
      <Modal
        open={dialog === "password"}
        onClose={() => setDialog(null)}
        title="Asignar contraseña temporal"
        description={`${user.name} deberá cambiarla al entrar.`}
        width="sm"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(() =>
              resetPasswordAction({ userId: user.id, password: String(form.get("password") ?? "") }),
            );
          }}
          className="flex flex-col gap-4"
        >
          <FormError message={error} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                label="Contraseña temporal"
                name="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint="Entrégala por un canal seguro. El sistema no la vuelve a mostrar."
                error={fieldErrors.password?.[0]}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPassword(suggestTemporaryPassword())}
            >
              Sugerir
            </Button>
          </div>
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

      {/* --- Desactivar --- */}
      <Modal
        open={dialog === "deactivate"}
        onClose={() => setDialog(null)}
        title="Desactivar cuenta"
        width="sm"
      >
        <FormError message={error} />
        <p className="text-sm text-ink-soft">
          {user.name} no podrá iniciar sesión. La cuenta no se elimina: su historial académico se
          conserva completo y puedes reactivarla cuando quieras.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => run(() => setUserActiveAction({ userId: user.id, active: false }))}
          >
            {pending ? "Procesando…" : "Desactivar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
