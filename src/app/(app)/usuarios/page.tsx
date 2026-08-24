import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { UserTable } from "@/components/users/user-table";
import { UserFilters } from "@/components/users/user-filters";
import { NewUserButton } from "@/components/users/new-user-button";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canUserManageUsers, canUserViewUsers } from "@/lib/permissions/rules";
import { listUsers, type UserListParams } from "@/modules/users/user-service";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<UserListParams>;
}) {
  const actor = await requireActor();
  if (!canUserViewUsers(actor)) redirect("/panel");

  const params = await searchParams;
  const canManage = canUserManageUsers(actor);

  const programWhere =
    actor.role === "ADMIN" ? { active: true } : { active: true, id: { in: actor.programIds } };

  const [result, programs, cohorts, counts] = await Promise.all([
    listUsers(actor, params),
    prisma.program.findMany({
      where: programWhere,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.cohort.findMany({
      where: { program: programWhere },
      select: { id: true, name: true, programId: true },
      orderBy: { name: "desc" },
    }),
    prisma.user.groupBy({
      by: ["role"],
      where:
        actor.role === "ADMIN"
          ? { active: true }
          : { active: true, memberships: { some: { programId: { in: actor.programIds } } } },
      _count: true,
    }),
  ]);

  const countOf = (role: string) => counts.find((c) => c.role === role)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={
          canManage
            ? "Cuentas del sistema. Las contraseñas que asignes aquí son temporales: el titular debe cambiarlas al entrar."
            : "Directorio de personas vinculadas a tus programas. La gestión de cuentas la hace la administración del sistema."
        }
        actions={
          canManage ? (
            <NewUserButton
              programs={programs}
              cohorts={cohorts}
              restrictToPrograms={actor.role === "ADMIN" ? null : actor.programIds}
            />
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Estudiantes" value={countOf("ESTUDIANTE")} tone="brand" />
        <StatCard label="Docentes" value={countOf("DIRECTOR")} />
        <StatCard label="Coordinación" value={countOf("COORDINADOR")} />
        <StatCard label="Administración" value={countOf("ADMIN")} />
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 pt-4">
          <UserFilters programs={programs} showProgram={programs.length > 1} />
        </div>
        <UserTable
          users={result.items}
          canManage={canManage}
          programs={programs}
          cohorts={cohorts}
          page={result.page}
          pages={result.pages}
          total={result.total}
          params={params}
        />
      </Card>
    </>
  );
}
