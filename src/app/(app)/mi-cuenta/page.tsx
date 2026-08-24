import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/components/users/change-password-form";
import { formatDateTime } from "@/lib/dates";
import { requireActor, ROLE_LABEL } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ cambio?: string }>;
}) {
  const actor = await requireActor();
  const params = await searchParams;
  const obligatorio = params.cambio === "obligatorio" || actor.mustChangePassword;

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      name: true,
      email: true,
      role: true,
      createdAt: true,
      passwordUpdatedAt: true,
      memberships: { select: { program: { select: { name: true, code: true } } } },
      studentProfile: {
        select: {
          studentCode: true,
          currentSemester: true,
          cohort: { select: { name: true } },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Mi cuenta"
        description={
          obligatorio
            ? "Tu contraseña la fijó la administración. Cámbiala para continuar."
            : "Datos de tu cuenta y cambio de contraseña."
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={obligatorio ? "Cambia tu contraseña para continuar" : "Cambiar contraseña"}
            description="Debe tener al menos 8 caracteres, con letras y números."
          />
          <CardBody>
            {obligatorio ? (
              <p className="mb-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
                Mientras no la cambies, el sistema te traerá a esta página.
              </p>
            ) : null}
            <ChangePasswordForm redirectOnSuccess={obligatorio} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Datos de la cuenta" />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Nombre</dt>
                <dd className="mt-0.5 text-sm">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Correo</dt>
                <dd className="mt-0.5 text-sm">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">Rol</dt>
                <dd className="mt-0.5 text-sm">{ROLE_LABEL[actor.role]}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                  Programas
                </dt>
                <dd className="mt-0.5 text-sm">
                  {user?.memberships.map((m) => m.program.name).join(", ") || "—"}
                </dd>
              </div>
              {user?.studentProfile ? (
                <>
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                      Código
                    </dt>
                    <dd className="mt-0.5 text-sm">{user.studentProfile.studentCode}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                      Semestre y cohorte
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      {user.studentProfile.currentSemester}
                      {user.studentProfile.cohort ? ` · ${user.studentProfile.cohort.name}` : ""}
                    </dd>
                  </div>
                </>
              ) : null}
              <div>
                <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
                  Última actualización de la contraseña
                </dt>
                <dd className="mt-0.5 text-sm">
                  {user?.passwordUpdatedAt ? formatDateTime(user.passwordUpdatedAt) : "Nunca"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 border-t border-border pt-4 text-sm text-ink-soft">
              ¿Olvidaste tu contraseña? Pídele a la administración del sistema que te asigne una
              temporal; al entrar con ella, el sistema te pedirá cambiarla.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
