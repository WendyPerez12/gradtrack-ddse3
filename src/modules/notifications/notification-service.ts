import type { NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export interface NotificationPayload {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Canal de entrega. El MVP solo implementa el canal interno; correo y WhatsApp
 * se añadirán implementando esta misma interfaz, sin tocar los servicios de
 * negocio que la consumen (§75).
 */
export interface NotificationChannel {
  readonly name: string;
  send(payload: NotificationPayload, db?: Db): Promise<void>;
}

class InAppChannel implements NotificationChannel {
  readonly name = "in-app";

  async send(payload: NotificationPayload, db: Db = prisma): Promise<void> {
    if (payload.userIds.length === 0) return;
    await db.notification.createMany({
      data: payload.userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link ?? null,
      })),
    });
  }
}

class NotificationService {
  private readonly channels: NotificationChannel[] = [new InAppChannel()];

  /** Registra un canal adicional (correo, WhatsApp) sin tocar los servicios. */
  register(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  async notify(payload: NotificationPayload, db: Db = prisma): Promise<void> {
    const recipients = [...new Set(payload.userIds.filter(Boolean))];
    if (recipients.length === 0) return;
    await Promise.all(
      this.channels.map((channel) =>
        channel.send({ ...payload, userIds: recipients }, db).catch((error) => {
          console.error(`[gradtrack] canal de notificación "${channel.name}" falló:`, error);
        }),
      ),
    );
  }
}

export const notificationService = new NotificationService();

export async function listNotifications(userId: string, limit = 15) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
