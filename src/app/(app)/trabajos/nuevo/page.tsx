import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { NewThesisForm } from "@/components/thesis/new-thesis-form";
import { requireActor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canUserManageThesisAssignment } from "@/lib/permissions/rules";

export const metadata: Metadata = { title: "Nuevo trabajo de grado" };

export default async function NewThesisPage() {
  const actor = await requireActor();
  const programIds =
    actor.role === "ADMIN"
      ? (await prisma.program.findMany({ where: { active: true }, select: { id: true } })).map((p) => p.id)
      : actor.programIds.filter((id) => canUserManageThesisAssignment(actor, id));

  if (programIds.length === 0) redirect("/trabajos");

  const [students, teachers] = await Promise.all([
    prisma.studentProfile.findMany({
      where: {
        active: true,
        programId: { in: programIds },
        theses: { none: { status: "ACTIVE" } },
      },
      select: {
        id: true,
        studentCode: true,
        currentSemester: true,
        program: { select: { name: true } },
        cohort: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { studentCode: "asc" },
    }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["DIRECTOR", "COORDINADOR"] },
        memberships: { some: { programId: { in: programIds } } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Nuevo trabajo de grado"
        description="Registra el trabajo y, si ya hay decisión del comité, asigna en el acto el director y el codirector."
      />
      <Card className="max-w-2xl">
        <CardHeader
          title="Datos del trabajo"
          description="El seguimiento empieza a contar desde la asignación del director."
        />
        <CardBody>
          <NewThesisForm
            students={students.map((student) => ({
              id: student.id,
              label: `${student.user.name} — ${student.studentCode} (${student.program.name}${
                student.cohort ? `, cohorte ${student.cohort.name}` : ""
              }, semestre ${student.currentSemester})`,
            }))}
            teachers={teachers.map((teacher) => ({ id: teacher.id, label: teacher.name }))}
          />
        </CardBody>
      </Card>
    </>
  );
}
