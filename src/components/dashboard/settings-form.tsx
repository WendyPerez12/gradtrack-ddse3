"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckboxInput, FormError, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { updateProgramSettingsAction } from "@/app/(app)/configuracion/actions";

export interface SettingsValues {
  minimumAdvisoriesPerPeriod: number;
  warningDaysWithoutAdvisory: number;
  criticalDaysWithoutAdvisory: number;
  riskWindowDaysBeforeDeadline: number;
  missedAdvisoryGraceDays: number;
  requireNextAdvisoryDate: boolean;
  alertsEnabled: boolean;
}

export function SettingsForm({
  programId,
  settings,
}: {
  programId: string;
  settings: SettingsValues;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateProgramSettingsAction({
        programId,
        minimumAdvisoriesPerPeriod: form.get("minimumAdvisoriesPerPeriod"),
        warningDaysWithoutAdvisory: form.get("warningDaysWithoutAdvisory"),
        criticalDaysWithoutAdvisory: form.get("criticalDaysWithoutAdvisory"),
        riskWindowDaysBeforeDeadline: form.get("riskWindowDaysBeforeDeadline"),
        missedAdvisoryGraceDays: form.get("missedAdvisoryGraceDays"),
        requireNextAdvisoryDate: form.get("requireNextAdvisoryDate") === "on",
        alertsEnabled: form.get("alertsEnabled") === "on",
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        toast.show(result.error, "error");
        return;
      }
      toast.show(result.message ?? "Configuración guardada.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">Reglas de seguimiento</p>
      <FormError message={error} />

      <TextInput
        label="Asesorías mínimas por periodo"
        name="minimumAdvisoriesPerPeriod"
        type="number"
        min={1}
        max={20}
        defaultValue={settings.minimumAdvisoriesPerPeriod}
        hint="Base del semáforo y del reporte de cumplimiento."
        error={fieldErrors.minimumAdvisoriesPerPeriod?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Días para advertencia"
          name="warningDaysWithoutAdvisory"
          type="number"
          min={1}
          defaultValue={settings.warningDaysWithoutAdvisory}
          hint="Inactividad que pasa a seguimiento."
          error={fieldErrors.warningDaysWithoutAdvisory?.[0]}
        />
        <TextInput
          label="Días para alerta crítica"
          name="criticalDaysWithoutAdvisory"
          type="number"
          min={1}
          defaultValue={settings.criticalDaysWithoutAdvisory}
          hint="Inactividad que exige intervención."
          error={fieldErrors.criticalDaysWithoutAdvisory?.[0]}
        />
        <TextInput
          label="Aviso antes del cierre (días)"
          name="riskWindowDaysBeforeDeadline"
          type="number"
          min={0}
          defaultValue={settings.riskWindowDaysBeforeDeadline}
          hint="Ventana para avisar por mínimo en riesgo."
          error={fieldErrors.riskWindowDaysBeforeDeadline?.[0]}
        />
        <TextInput
          label="Gracia por cita vencida (días)"
          name="missedAdvisoryGraceDays"
          type="number"
          min={0}
          defaultValue={settings.missedAdvisoryGraceDays}
          hint="Margen para confirmar o reprogramar."
          error={fieldErrors.missedAdvisoryGraceDays?.[0]}
        />
      </div>

      <CheckboxInput
        label="Exigir fecha de la próxima asesoría al confirmar"
        name="requireNextAdvisoryDate"
        defaultChecked={settings.requireNextAdvisoryDate}
      />
      <CheckboxInput
        label="Generar alertas para este programa"
        name="alertsEnabled"
        defaultChecked={settings.alertsEnabled}
      />

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}
