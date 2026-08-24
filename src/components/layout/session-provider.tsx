"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Necesario para que el cliente pueda refrescar la sesión sin recargar, por
 * ejemplo al cambiar la contraseña y dejar de estar obligado a hacerlo.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
