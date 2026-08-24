"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { toActionError, type ActionResult } from "@/lib/errors";
import { parseInput } from "@/lib/validations/parse";
import { changeOwnPasswordSchema } from "@/lib/validations/user";
import { changeOwnPassword } from "@/modules/users/user-service";

/** El titular cambia su propia contraseña verificando la anterior. */
export async function changeOwnPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const actor = await requireActor();
    const data = parseInput(changeOwnPasswordSchema, input);
    await changeOwnPassword(actor, data.currentPassword, data.newPassword);
    revalidatePath("/mi-cuenta");
    return { ok: true, data: undefined, message: "Tu contraseña quedó actualizada." };
  } catch (error) {
    return toActionError(error);
  }
}
