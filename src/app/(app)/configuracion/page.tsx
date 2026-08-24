import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { PeriodList } from "@/components/dashboard/period-list";
import { requireRole } from "@/lib/auth/session";
import { listProgramsWithContext } from "@/modules/programs/program-service";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const actor = await requireRole(["ADMIN", "COORDINADOR"]);
  const programs = await listProgramsWithContext(actor.role === "ADMIN" ? null : actor.programIds);

  return (
    <>
      <PageHeader
        title="Configuración del programa"
        description="Los umbrales de alerta y el mínimo de asesorías se parametrizan aquí. Ningún valor está fijado en el código."
      />

      <div className="flex flex-col gap-6">
        {programs.map((program) => (
          <Card key={program.id}>
            <CardHeader
              title={`${program.name} (${program.code})`}
              description={`${program._count.theses} trabajos · ${program._count.studentProfiles} estudiantes`}
            />
            <CardBody className="grid gap-8 lg:grid-cols-2">
              <SettingsForm
                programId={program.id}
                settings={{
                  minimumAdvisoriesPerPeriod: program.settings?.minimumAdvisoriesPerPeriod ?? 2,
                  warningDaysWithoutAdvisory: program.settings?.warningDaysWithoutAdvisory ?? 30,
                  criticalDaysWithoutAdvisory: program.settings?.criticalDaysWithoutAdvisory ?? 45,
                  riskWindowDaysBeforeDeadline: program.settings?.riskWindowDaysBeforeDeadline ?? 28,
                  missedAdvisoryGraceDays: program.settings?.missedAdvisoryGraceDays ?? 7,
                  requireNextAdvisoryDate: program.settings?.requireNextAdvisoryDate ?? false,
                  alertsEnabled: program.settings?.alertsEnabled ?? true,
                }}
              />
              <PeriodList
                programId={program.id}
                periods={program.periods.map((period) => ({
                  id: period.id,
                  name: period.name,
                  startDate: period.startDate.toISOString(),
                  endDate: period.endDate.toISOString(),
                  active: period.active,
                  status: period.status,
                }))}
              />
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
