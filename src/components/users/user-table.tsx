import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { UserRowActions } from "@/components/users/user-row-actions";
import { ROLE_LABEL } from "@/lib/auth/session";
import type { ActorRole } from "@/lib/permissions/rules";
import type { UserListItem } from "@/modules/users/user-service";
import type { UserListParams } from "@/modules/users/user-service";

export function UserTable({
  users,
  canManage,
  programs,
  cohorts,
  page,
  pages,
  total,
  params,
}: {
  users: UserListItem[];
  canManage: boolean;
  programs: Array<{ id: string; name: string; code: string }>;
  cohorts: Array<{ id: string; name: string; programId: string }>;
  page: number;
  pages: number;
  total: number;
  params: UserListParams;
}) {
  const columns: Column<UserListItem>[] = [
    {
      key: "name",
      header: "Persona",
      cell: (user) => (
        <div className="min-w-48">
          <p className="font-medium text-ink">{user.name}</p>
          <p className="text-xs text-ink-faint">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      cell: (user) => <span className="text-ink-soft">{ROLE_LABEL[user.role as ActorRole]}</span>,
    },
    {
      key: "programs",
      header: "Programas",
      cell: (user) => (
        <span className="text-ink-soft">
          {user.memberships.map((m) => m.program.code).join(" · ") ||
            user.studentProfile?.program.code ||
            "—"}
        </span>
      ),
    },
    {
      key: "academic",
      header: "Datos académicos",
      cell: (user) =>
        user.studentProfile ? (
          <span className="text-ink-soft">
            {user.studentProfile.studentCode} · semestre {user.studentProfile.currentSemester}
            {user.studentProfile.cohort ? ` · ${user.studentProfile.cohort.name}` : ""}
          </span>
        ) : user._count.supervisions > 0 ? (
          <span className="text-ink-soft">{user._count.supervisions} supervisión(es)</span>
        ) : (
          <span className="text-ink-faint">—</span>
        ),
    },
    {
      key: "state",
      header: "Estado",
      cell: (user) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={
              user.active
                ? "rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok"
                : "rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-soft"
            }
          >
            {user.active ? "Activa" : "Desactivada"}
          </span>
          {user.mustChangePassword ? (
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
              Contraseña temporal
            </span>
          ) : null}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Acciones",
            cell: (user: UserListItem) => (
              <UserRowActions user={user} programs={programs} cohorts={cohorts} />
            ),
          },
        ]
      : []),
  ];

  const hrefFor = (nextPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") search.set(key, String(value));
    }
    search.set("page", String(nextPage));
    return `/usuarios?${search.toString()}`;
  };

  return (
    <>
      <DataTable
        columns={columns}
        rows={users}
        getKey={(user) => user.id}
        caption="Directorio de cuentas"
        empty={
          <EmptyState
            title="No hay cuentas que coincidan"
            description="Ajusta los filtros o crea una cuenta nueva."
          />
        }
      />
      <Pagination page={page} pages={pages} total={total} hrefFor={hrefFor} />
    </>
  );
}
