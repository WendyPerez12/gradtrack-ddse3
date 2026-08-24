"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Página de error. En producción no se muestra el detalle técnico: solo el
 * servidor lo registra (§70).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[gradtrack] error de interfaz:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-ink">Algo salió mal</h1>
        <p className="mt-2 text-sm text-ink-soft">
          No pudimos completar la operación. Intenta de nuevo; si el problema persiste, avisa a la
          administración del sistema.
        </p>
        {process.env.NODE_ENV === "development" ? (
          <pre className="mt-4 overflow-x-auto rounded-md bg-surface-muted p-3 text-left text-xs text-ink-soft">
            {error.message}
          </pre>
        ) : null}
        <Button className="mt-5" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}
