"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { FormError, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { changeOwnPasswordAction } from "@/app/(app)/mi-cuenta/actions";

export function ChangePasswordForm({ redirectOnSuccess = false }: { redirectOnSuccess?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await changeOwnPasswordAction({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
        confirmPassword: String(data.get("confirmPassword") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      form.reset();
      toast.show(result.message ?? "Contraseña actualizada.");
      // Refresca la sesión para que deje de exigirse el cambio.
      await update({ mustChangePassword: false });
      if (redirectOnSuccess) router.push("/panel");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError message={error} />
      <TextInput
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors.currentPassword?.[0]}
      />
      <TextInput
        label="Contraseña nueva"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres, con letras y números."
        error={fieldErrors.newPassword?.[0]}
      />
      <TextInput
        label="Repite la contraseña nueva"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={fieldErrors.confirmPassword?.[0]}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
