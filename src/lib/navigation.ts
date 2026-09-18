import type { ActorRole } from "@/lib/permissions/rules";

export interface NavItem {
  href: string;
  label: string;
  icon: "panel" | "thesis" | "advisory" | "alert" | "report" | "settings" | "audit" | "users" | "account";
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
    href: "/usuarios",
    label: "Usuarios",
    icon: "users",
    roles: ["ADMIN", "COORDINADOR"],
  },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: "settings",
    roles: ["ADMIN", "COORDINADOR"],
  },
  { href: "/auditoria", label: "Auditoría", icon: "audit", roles: ["ADMIN"] },
  {
    href: "/mi-cuenta",
    label: "Mi cuenta",
    icon: "account",
    roles: ["ADMIN", "COORDINADOR", "DIRECTOR", "CODIRECTOR", "ESTUDIANTE"],
  },
];

export function navItemsFor(role: ActorRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Nombre del sistema, desacoplado de la lógica para poder cambiarlo (§1). */
export const APP_NAME = "SIGET";
export const APP_TAGLINE = "Sistema Integral de Gestión y Seguimiento de Trabajos de Grado";
