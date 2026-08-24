"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { ForbiddenError, toActionError, type ActionResult } from "@/lib/errors";
import { canUserManageUsers } from "@/lib/permissions/rules";
import { parseInput } from "@/lib/validations/parse";
import {
  createUserSchema,
  resetPasswordSchema,
  setUserActiveSchema,
  updateUserSchema,
} from "@/lib/validations/user";
import { createUser, resetPassword, setUserActive, updateUser } from "@/modules/users/user-service";
import type { Actor } from "@/lib/permissions/rules";

/** Toda operación sobre cuentas es de administración (§11). */
async function requireUserAdmin(): Promise<Actor> {
  const actor = await requireActor();
  if (!canUserManageUsers(actor)) {
    throw new ForbiddenError("Solo la administración del sistema gestiona las cuentas.");
  }
  return actor;
}

export async function createUserAction(input: unknown): Promise<ActionResult<{ userId: string }>> {
  try {
    const actor = await requireUserAdmin();
    const data = parseInput(createUserSchema, input);
    const user = await createUser(actor, data);
    revalidatePath("/usuarios");
    return {
      ok: true,
      data: { userId: user.id },
      message: `Cuenta creada para ${user.name}. Deberá cambiar la contraseña al entrar.`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireUserAdmin();
    const data = parseInput(updateUserSchema, input);
    await updateUser(actor, data);
    revalidatePath("/usuarios");
    return { ok: true, data: undefined, message: "Cuenta actualizada." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserActiveAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireUserAdmin();
    const data = parseInput(setUserActiveSchema, input);
    await setUserActive(actor, data.userId, data.active);
    revalidatePath("/usuarios");
    return {
      ok: true,
      data: undefined,
      message: data.active ? "Cuenta reactivada." : "Cuenta desactivada.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireUserAdmin();
    const data = parseInput(resetPasswordSchema, input);
    await resetPassword(actor, data.userId, data.password);
    revalidatePath("/usuarios");
    return {
      ok: true,
      data: undefined,
      message: "Contraseña temporal asignada. Entrégala a la persona por un canal seguro.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
