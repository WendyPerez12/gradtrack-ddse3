"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { createUserAction } from "@/app/(app)/usuarios/actions";

export function NewUserButton({
  programs,
  cohorts,
}: {
  programs: ProgramOption[];
  cohorts: CohortOption[];
  restrictToPrograms?: string[] | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createUserAction({
        ...readUserForm(form),
        password: String(form.get("password") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      toast.show(result.message ?? "Cuenta creada.");
      setOpen(false);
      setPassword("");
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden="true" />
        Nueva cuenta
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva cuenta"
        description="La contraseña que asignes es temporal: el sistema pedirá cambiarla en el primer ingreso."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormError message={error} />
          <UserFormFields programs={programs} cohorts={cohorts} fieldErrors={fieldErrors} />

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                label="Contraseña temporal"
                name="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint="Mínimo 8 caracteres, con letras y números. Entrégala por un canal seguro."
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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Crear cuenta"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
