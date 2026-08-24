"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { NavLinks } from "@/components/layout/nav";
import { APP_NAME, APP_TAGLINE, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({
  items,
  userName,
  roleLabel,
  programLabel,
  notifications,
  children,
}: {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  programLabel: string | null;
  notifications: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-brand-strong px-4 py-5">
      <Link href="/panel" className="block" onClick={() => setMenuOpen(false)}>
        <p className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</p>
        <p className="mt-0.5 text-xs leading-tight text-[rgba(255,255,255,0.6)]">{APP_TAGLINE}</p>
      </Link>
      <NavLinks items={items} onNavigate={() => setMenuOpen(false)} />
      <div className="mt-auto border-t border-[rgba(255,255,255,0.15)] pt-4">
        <p className="text-sm font-medium text-white">{userName}</p>
        <p className="text-xs text-[rgba(255,255,255,0.6)]">
          {roleLabel}
          {programLabel ? ` · ${programLabel}` : ""}
        </p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Menú móvil */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-[rgba(15,27,45,0.5)] transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85%] transition-transform",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar}
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:px-8">
          <button
            type="button"
            className="rounded-md p-1.5 text-ink-soft hover:bg-surface-muted lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <p className="truncate text-sm text-ink-soft">
            <span className="font-medium text-ink">{userName}</span>
            <span className="hidden sm:inline"> · {roleLabel}</span>
          </p>
          <div className="ml-auto flex items-center gap-2">{notifications}</div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
