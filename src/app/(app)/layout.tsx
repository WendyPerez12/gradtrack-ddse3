import { formatDateTime } from "@/lib/dates";
import { requireActor, ROLE_LABEL } from "@/lib/auth/session";
import { navItemsFor } from "@/lib/navigation";
import { prisma } from "@/lib/db/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationBell } from "@/components/layout/notification-bell";
import { countUnread, listNotifications } from "@/modules/notifications/notification-service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();

  const [user, notifications, unread, programs] = await Promise.all([
    prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } }),
    listNotifications(actor.id),
    countUnread(actor.id),
    actor.programIds.length
      ? prisma.program.findMany({
          where: { id: { in: actor.programIds } },
          select: { code: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppShell
      items={navItemsFor(actor.role)}
      userName={user?.name ?? "Usuario"}
      roleLabel={ROLE_LABEL[actor.role]}
      programLabel={programs.map((p) => p.code).join(" · ") || null}
      notifications={
        <NotificationBell
          unread={unread}
          items={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            link: n.link,
            read: Boolean(n.readAt),
            createdAt: formatDateTime(n.createdAt),
          }))}
        />
      }
    >
      {children}
    </AppShell>
  );
}
