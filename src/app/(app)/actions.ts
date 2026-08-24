"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/auth/session";
import { markAllRead } from "@/modules/notifications/notification-service";

/** Marca como leídas las notificaciones internas del usuario actual. */
export async function markNotificationsReadAction(): Promise<void> {
  const actor = await requireActor();
  await markAllRead(actor.id);
  revalidatePath("/", "layout");
}
