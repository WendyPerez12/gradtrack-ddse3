import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { AlertSummaryPanel } from "@/components/dashboard/alert-summary-panel";
import { ThesisTable } from "@/components/thesis/thesis-table";
import { ThesisFilters } from "@/components/thesis/thesis-filters";
import { formatLongDate } from "@/lib/dates";
import type { Actor } from "@/lib/permissions/rules";
import { getActiveAlertSummaries } from "@/modules/alerts/alert-query";
import { getActivePeriods } from "@/modules/programs/program-service";
import {
  buildThesisWhere,
  getFilterOptions,
  makeHrefBuilder,
  queryThesisList,
  type ThesisListParams,
} from "@/modules/theses/thesis-query";

/**
 * Panel de coordinación (§34, §84). Debe permitir responder en segundos:
 * cuántos al día, cuántos en riesgo, cuántos en alerta y quiénes son.
 */
export async function CoordinatorPanel({
  actor,
  params,
}: {
  actor: Actor;
  params: ThesisListParams;
}) {
  const [list, options, alerts] = await Promise.all([
    queryThesisList(actor, params),
    getFilterOptions(actor),
    getActiveAlertSummaries(buildThesisWhere(actor, params)),
  ]);

  // Una coordinación puede llevar varios programas, cada uno con su propio
  // periodo: mostrar solo el primero daría una fecha de cierre equivocada.
  const periods = await getActivePeriods(actor.role === "ADMIN" ? null : actor.programIds);
  const eyebrow =
    periods.length === 0
      ? "Sin periodo activo"
      : periods.length === 1
        ? `Periodo ${periods[0]!.name} · cierra el ${formatLongDate(periods[0]!.endDate)}`
        : periods
            .map((p) => `${p.program.code} ${p.name} cierra el ${formatLongDate(p.endDate)}`)
            .join(" · ");

  const multiPrograma = actor.role === "ADMIN" || actor.programIds.length > 1;
  const href = makeHrefBuilder("/panel", params);

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Panel de seguimiento"
        description="Estado de todos los trabajos de grado del programa, calculado a partir de las asesorías registradas y del calendario académico."
        actions={
          <Link href="/trabajos/nuevo" className={buttonVariants({ variant: "primary" })}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo trabajo
          </Link>
        }
      />

      <SummaryCards summary={list.summary} />

      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden">
          <div className="px-5 pt-4">
            <ThesisFilters
              basePath="/panel"
              programs={options.programs}
              cohorts={options.cohorts}
              directors={options.directors}
              semesters={options.semesters}
              showProgram={actor.role === "ADMIN" || actor.programIds.length > 1}
            />
          </div>
          <ThesisTable
            rows={list.rows}
            sort={list.sort}
            dir={list.dir}
            hrefForSort={(key) => href.forSort(key, { sort: list.sort, dir: list.dir })}
            hrefForPage={href.forPage}
            page={list.page}
            pages={list.pages}
            total={list.total}
            showProgram={multiPrograma}
          />
        </Card>

        <AlertSummaryPanel alerts={alerts} />
      </div>
    </>
  );
}
