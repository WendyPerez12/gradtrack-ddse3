"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CalendarCheck,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  Settings,
  TriangleAlert,
} from "lucide-react";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const ICONS = {
  panel: LayoutDashboard,
  thesis: GraduationCap,
  advisory: CalendarCheck,
  alert: TriangleAlert,
  report: FileSearch,
  settings: Settings,
  audit: BellRing,
} as const;

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navegación principal">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[rgba(255,255,255,0.14)] font-medium text-white"
                : "text-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
