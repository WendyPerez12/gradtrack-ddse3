"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markNotificationsReadAction } from "@/app/(app)/actions";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({
  items,
  unread,
}: {
  items: NotificationItem[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md p-1.5 text-ink-soft hover:bg-surface-muted"
        aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        aria-expanded={open}
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-risk text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold">Notificaciones</p>
              {unread > 0 ? (
                <form action={markNotificationsReadAction}>
                  <button type="submit" className="text-xs text-brand hover:underline">
                    Marcar como leídas
                  </button>
                </form>
              ) : null}
            </div>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-ink-soft">Sin notificaciones.</li>
              ) : (
                items.map((item) => (
                  <li key={item.id} className={item.read ? "bg-surface" : "bg-brand-soft/40"}>
                    <Link
                      href={item.link ?? "/panel"}
                      className="block px-4 py-3 hover:bg-surface-muted"
                      onClick={() => setOpen(false)}
                    >
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{item.body}</p>
                      <p className="mt-1 text-[11px] text-ink-faint">{item.createdAt}</p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
