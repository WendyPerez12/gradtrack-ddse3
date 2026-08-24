"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { activatePeriodAction } from "@/app/(app)/configuracion/actions";

interface PeriodRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Planeado",
  ACTIVE: "Activo",
  CLOSED: "Cerrado",
};

export function PeriodList({ programId, periods }: { programId: string; periods: PeriodRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const format = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">Periodos académicos</p>
      {periods.length === 0 ? (
        <p className="text-sm text-ink-soft">Este programa aún no tiene periodos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {periods.map((period) => (
            <li key={period.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">
                  {period.name}
                  {period.active ? <span className="ml-2 text-xs text-ok">· activo</span> : null}
                </p>
                <p className="text-xs text-ink-faint">
                  {format(period.startDate)} — {format(period.endDate)} · {STATUS_LABEL[period.status]}
                </p>
              </div>
              {!period.active ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await activatePeriodAction({ periodId: period.id, programId });
                      toast.show(
                        result.ok ? (result.message ?? "Periodo activado.") : result.error,
                        result.ok ? "success" : "error",
                      );
                      router.refresh();
                    })
                  }
                >
                  Activar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-faint">
        El periodo activo define qué asesorías cuentan para el mínimo y desde cuándo se miden las alertas.
      </p>
    </div>
  );
}
