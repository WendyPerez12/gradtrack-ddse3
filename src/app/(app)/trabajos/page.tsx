import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ThesisFilters } from "@/components/thesis/thesis-filters";
import { ThesisTable } from "@/components/thesis/thesis-table";
import { requireActor } from "@/lib/auth/session";
import { canUserManageThesisAssignment } from "@/lib/permissions/rules";
import {
  getFilterOptions,
  makeHrefBuilder,
  queryThesisList,
  type ThesisListParams,
} from "@/modules/theses/thesis-query";

export const metadata: Metadata = { title: "Trabajos de grado" };

export default async function ThesesPage({
  searchParams,
}: {
  searchParams: Promise<ThesisListParams>;
}) {
  const actor = await requireActor();
  const params = await searchParams;

  const [list, options] = await Promise.all([queryThesisList(actor, params), getFilterOptions(actor)]);
  const href = makeHrefBuilder("/trabajos", params);
  const canCreate = actor.programIds.some((programId) =>
    canUserManageThesisAssignment(actor, programId),
  );

  return (
    <>
      <PageHeader
        title="Trabajos de grado"
        description="Listado completo con el estado de seguimiento de cada trabajo. Filtra, ordena y abre la ficha para ver el detalle."
        actions={
          canCreate ? (
            <Link href="/trabajos/nuevo" className={buttonVariants({ variant: "primary" })}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo trabajo
            </Link>
          ) : null
        }
      />

      <SummaryCards summary={list.summary} />

      <Card className="overflow-hidden">
        <div className="px-5 pt-4">
          <ThesisFilters
            basePath="/trabajos"
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
          showProgram={actor.role === "ADMIN" || actor.programIds.length > 1}
        />
      </Card>
    </>
  );
}
