import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { DataTable, Pagination, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/dates";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Auditoría" };

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Inicio de sesión",
  THESIS_CREATED: "Trabajo creado",
  THESIS_UPDATED: "Trabajo actualizado",
  DIRECTOR_ASSIGNED: "Director asignado",
  DIRECTOR_CHANGED: "Cambio de director",
  CODIRECTOR_ASSIGNED: "Codirector asignado",
  CODIRECTOR_REMOVED: "Codirector retirado",
  ADVISORY_CREATED: "Asesoría programada",
  ADVISORY_UPDATED: "Asesoría modificada",
  ADVISORY_COMPLETED: "Asesoría realizada",
  ADVISORY_NOT_COMPLETED: "Asesoría no realizada",
  ADVISORY_CANCELLED: "Asesoría cancelada",
  COMMITMENT_CREATED: "Compromiso registrado",
  COMMITMENT_COMPLETED: "Compromiso actualizado",
  SETTINGS_CHANGED: "Configuración modificada",
  ALERT_RESOLVED: "Alerta gestionada",
  ALERT_DISMISSED: "Alerta descartada",
};

type Row = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  user: { name: string; role: string } | null;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = 20;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count(),
  ]);

  const columns: Column<Row>[] = [
    {
      key: "date",
      header: "Fecha",
      cell: (row) => <span className="tabular-nums whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
    },
    { key: "action", header: "Acción", cell: (row) => ACTION_LABEL[row.action] ?? row.action },
    {
      key: "user",
      header: "Usuario",
      cell: (row) => (row.user ? `${row.user.name}` : "Sistema"),
    },
    { key: "entity", header: "Entidad", cell: (row) => <span className="text-ink-soft">{row.entityType}</span> },
    {
      key: "id",
      header: "Identificador",
      cell: (row) => <code className="font-mono text-xs text-ink-faint">{row.entityId}</code>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de las acciones relevantes del sistema."
      />
      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={items}
          getKey={(row) => row.id}
          caption="Registro de auditoría"
          empty={<EmptyState title="Sin eventos registrados" />}
        />
        <Pagination
          page={page}
          pages={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          hrefFor={(nextPage) => `/auditoria?page=${nextPage}`}
        />
      </Card>
    </>
  );
}
