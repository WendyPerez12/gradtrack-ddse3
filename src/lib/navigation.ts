import type { ActorRole } from "@/lib/permissions/rules";

export interface NavItem {
  href: string;
  label: string;
  icon: "panel" | "thesis" | "advisory" | "alert" | "report" | "settings" | "audit";
  roles: ActorRole[];
}

/** Menú lateral. Cada opción declara qué roles la ven (§49). */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/panel",
    label: "Panel",
    icon: "panel",
    roles: ["ADMIN", "COORDINADOR", "DIRECTOR", "CODIRECTOR", "ESTUDIANTE"],
  },
  {
    href: "/trabajos",
    label: "Trabajos de grado",
    icon: "thesis",
    roles: ["ADMIN", "COORDINADOR", "DIRECTOR", "CODIRECTOR"],
  },
  {
    href: "/asesorias",
    label: "Asesorías",
    icon: "advisory",
    roles: ["ADMIN", "COORDINADOR", "DIRECTOR", "CODIRECTOR", "ESTUDIANTE"],
  },
  {
    href: "/alertas",
    label: "Alertas",
    icon: "alert",
    roles: ["ADMIN", "COORDINADOR", "DIRECTOR", "CODIRECTOR"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: "report",
    roles: ["ADMIN", "COORDINADOR"],
  },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: "settings",
    roles: ["ADMIN", "COORDINADOR"],
  },
  { href: "/auditoria", label: "Auditoría", icon: "audit", roles: ["ADMIN"] },
];

export function navItemsFor(role: ActorRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Nombre del sistema, desacoplado de la lógica para poder cambiarlo (§1). */
export const APP_NAME = "GradTrack";
export const APP_TAGLINE = "Sistema de Seguimiento de Trabajos de Grado";
