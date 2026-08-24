/**
 * Datos de demostración de GradTrack.
 *
 * Las fechas se calculan relativas al día en que se ejecuta el seed para que
 * los tres escenarios del semáforo (al día / seguimiento / alerta) se vean
 * correctamente sin importar cuándo se corra la demostración.
 *
 * Uso: pnpm db:seed
 */
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { syncThesisAlerts } from "../src/modules/alerts/alert-service";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DAY = 86_400_000;
const today = new Date();
const day = (offset: number): Date => {
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return new Date(base.getTime() + offset * DAY);
};

const PASSWORDS = {
  admin: "Admin123*",
  coordinador: "Coord123*",
  director: "Director123*",
  estudiante: "Estudiante123*",
};

async function hash(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function clean() {
  // Orden inverso de dependencias. Solo para el entorno de demostración.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.advisoryCommitment.deleteMany();
  await prisma.advisoryAttendance.deleteMany();
  await prisma.advisory.deleteMany();
  await prisma.thesisSupervision.deleteMany();
  await prisma.thesis.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.academicPeriod.deleteMany();
  await prisma.programSettings.deleteMany();
  await prisma.programMembership.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("→ Limpiando datos anteriores…");
  await clean();

  const [adminHash, coordHash, directorHash, studentHash] = await Promise.all([
    hash(PASSWORDS.admin),
    hash(PASSWORDS.coordinador),
    hash(PASSWORDS.director),
    hash(PASSWORDS.estudiante),
  ]);

  console.log("→ Programas académicos…");
  const educacion = await prisma.program.create({
    data: {
      name: "Maestría en Educación",
      code: "MED",
      level: "MASTER",
      settings: {
        create: {
          minimumAdvisoriesPerPeriod: 2,
          warningDaysWithoutAdvisory: 30,
          criticalDaysWithoutAdvisory: 45,
          riskWindowDaysBeforeDeadline: 28,
          missedAdvisoryGraceDays: 7,
          requireNextAdvisoryDate: false,
          alertsEnabled: true,
        },
      },
    },
  });

  // Segundo programa: sirve para comprobar que un coordinador no ve lo ajeno.
  const ingenieria = await prisma.program.create({
    data: {
      name: "Maestría en Ingeniería",
      code: "MING",
      level: "MASTER",
      settings: { create: {} },
    },
  });

  console.log("→ Periodos y cohortes…");
  const periodo = await prisma.academicPeriod.create({
    data: {
      programId: educacion.id,
      name: "2026-2",
      startDate: day(-34),
      endDate: day(96),
      advisoryDeadline: day(89),
      active: true,
      status: "ACTIVE",
    },
  });

  await prisma.academicPeriod.create({
    data: {
      programId: educacion.id,
      name: "2026-1",
      startDate: day(-215),
      endDate: day(-45),
      advisoryDeadline: day(-50),
      active: false,
      status: "CLOSED",
    },
  });

  const periodoIng = await prisma.academicPeriod.create({
    data: {
      programId: ingenieria.id,
      name: "2026-2",
      startDate: day(-34),
      endDate: day(96),
      advisoryDeadline: day(89),
      active: true,
      status: "ACTIVE",
    },
  });

  const cohortes = await Promise.all(
    [
      { name: "2025-1", startYear: 2025, startPeriod: 1 },
      { name: "2025-2", startYear: 2025, startPeriod: 2 },
      { name: "2026-1", startYear: 2026, startPeriod: 1 },
    ].map((c) => prisma.cohort.create({ data: { ...c, programId: educacion.id } })),
  );
  const [c2025_1, c2025_2, c2026_1] = cohortes;

  const cohorteIng = await prisma.cohort.create({
    data: { name: "2025-2", startYear: 2025, startPeriod: 2, programId: ingenieria.id },
  });

  console.log("→ Usuarios…");
  const admin = await prisma.user.create({
    data: {
      name: "Administración GradTrack",
      email: "admin@gradtrack.test",
      passwordHash: adminHash,
      role: "ADMIN",
      memberships: {
        create: [
          { programId: educacion.id, role: "ADMIN" },
          { programId: ingenieria.id, role: "ADMIN" },
        ],
      },
    },
  });

  const coordinador = await prisma.user.create({
    data: {
      name: "Marcela Cifuentes",
      email: "coordinacion@gradtrack.test",
      passwordHash: coordHash,
      role: "COORDINADOR",
      memberships: { create: [{ programId: educacion.id, role: "COORDINADOR" }] },
    },
  });

  const coordinadorIng = await prisma.user.create({
    data: {
      name: "Julián Estrada",
      email: "coordinacion.ing@gradtrack.test",
      passwordHash: coordHash,
      role: "COORDINADOR",
      memberships: { create: [{ programId: ingenieria.id, role: "COORDINADOR" }] },
    },
  });

  const director1 = await prisma.user.create({
    data: {
      name: "Hernán Ocampo",
      email: "director1@gradtrack.test",
      passwordHash: directorHash,
      role: "DIRECTOR",
      memberships: { create: [{ programId: educacion.id, role: "DIRECTOR" }] },
    },
  });

  const director2 = await prisma.user.create({
    data: {
      name: "Camilo Arango",
      email: "director2@gradtrack.test",
      passwordHash: directorHash,
      role: "DIRECTOR",
      memberships: { create: [{ programId: educacion.id, role: "DIRECTOR" }] },
    },
  });

  const codirector = await prisma.user.create({
    data: {
      name: "Iván Bedoya",
      email: "codirector@gradtrack.test",
      passwordHash: directorHash,
      role: "DIRECTOR",
      memberships: { create: [{ programId: educacion.id, role: "DIRECTOR" }] },
    },
  });

  const directorIng = await prisma.user.create({
    data: {
      name: "Sara Quintero",
      email: "director.ing@gradtrack.test",
      passwordHash: directorHash,
      role: "DIRECTOR",
      memberships: { create: [{ programId: ingenieria.id, role: "DIRECTOR" }] },
    },
  });

  async function createStudent(opts: {
    name: string;
    email: string;
    code: string;
    semester: number;
    cohortId: string;
    programId: string;
  }) {
    const user = await prisma.user.create({
      data: {
        name: opts.name,
        email: opts.email,
        passwordHash: studentHash,
        role: "ESTUDIANTE",
        studentProfile: {
          create: {
            programId: opts.programId,
            cohortId: opts.cohortId,
            studentCode: opts.code,
            currentSemester: opts.semester,
          },
        },
      },
      include: { studentProfile: true },
    });
    return { user, profile: user.studentProfile! };
  }

  const est1 = await createStudent({
    name: "Laura Restrepo Vélez",
    email: "estudiante1@gradtrack.test",
    code: "MED-2025-014",
    semester: 3,
    cohortId: c2025_1!.id,
    programId: educacion.id,
  });

  const est2 = await createStudent({
    name: "Andrés Felipe Mora",
    email: "estudiante2@gradtrack.test",
    code: "MED-2025-021",
    semester: 3,
    cohortId: c2025_1!.id,
    programId: educacion.id,
  });

  const est3 = await createStudent({
    name: "Diana Carolina Pineda",
    email: "estudiante3@gradtrack.test",
    code: "MED-2025-033",
    semester: 2,
    cohortId: c2025_2!.id,
    programId: educacion.id,
  });

  const est4 = await createStudent({
    name: "Mateo Salazar Uribe",
    email: "estudiante4@gradtrack.test",
    code: "MED-2025-041",
    semester: 2,
    cohortId: c2025_2!.id,
    programId: educacion.id,
  });

  const est5 = await createStudent({
    name: "Valentina Ochoa Ruiz",
    email: "estudiante5@gradtrack.test",
    code: "MED-2026-007",
    semester: 2,
    cohortId: c2026_1!.id,
    programId: educacion.id,
  });

  const est6 = await createStudent({
    name: "Óscar Iván Zapata",
    email: "estudiante6@gradtrack.test",
    code: "MED-2026-012",
    semester: 2,
    cohortId: c2026_1!.id,
    programId: educacion.id,
  });

  const estIng = await createStudent({
    name: "Paula Andrea Gómez",
    email: "estudiante.ing@gradtrack.test",
    code: "MING-2025-003",
    semester: 3,
    cohortId: cohorteIng.id,
    programId: ingenieria.id,
  });

  console.log("→ Trabajos de grado y supervisión…");

  async function createThesis(opts: {
    studentProfileId: string;
    programId: string;
    title: string;
    description?: string;
    assignedDaysAgo: number | null;
    directorId?: string;
    codirectorId?: string;
    assignedById: string;
  }) {
    const thesis = await prisma.thesis.create({
      data: {
        studentId: opts.studentProfileId,
        programId: opts.programId,
        title: opts.title,
        description: opts.description ?? null,
        assignedAt: opts.assignedDaysAgo === null ? null : day(-opts.assignedDaysAgo),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: opts.assignedById,
        action: "THESIS_CREATED",
        entityType: "Thesis",
        entityId: thesis.id,
        metadata: { title: thesis.title },
        createdAt: opts.assignedDaysAgo === null ? new Date() : day(-opts.assignedDaysAgo),
      },
    });

    if (opts.directorId) {
      const supervision = await prisma.thesisSupervision.create({
        data: {
          thesisId: thesis.id,
          userId: opts.directorId,
          type: "DIRECTOR",
          assignedById: opts.assignedById,
          startedAt: day(-(opts.assignedDaysAgo ?? 0)),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: opts.assignedById,
          action: "DIRECTOR_ASSIGNED",
          entityType: "ThesisSupervision",
          entityId: supervision.id,
          metadata: { thesisId: thesis.id, newUserId: opts.directorId },
          createdAt: day(-(opts.assignedDaysAgo ?? 0)),
        },
      });
    }

    if (opts.codirectorId) {
      await prisma.thesisSupervision.create({
        data: {
          thesisId: thesis.id,
          userId: opts.codirectorId,
          type: "CODIRECTOR",
          assignedById: opts.assignedById,
          startedAt: day(-(opts.assignedDaysAgo ?? 0)),
        },
      });
    }

    return thesis;
  }

  // --- Escenario A: AL DÍA -------------------------------------------------
  const tesisA = await createThesis({
    studentProfileId: est1.profile.id,
    programId: educacion.id,
    title: "Estrategias de evaluación formativa en la educación media rural",
    description: "Estudio de caso en tres instituciones del departamento.",
    assignedDaysAgo: 120,
    directorId: director1.id,
    codirectorId: codirector.id,
    assignedById: coordinador.id,
  });

  // --- Escenario B: SEGUIMIENTO (1 de 2 e inactividad preventiva) ----------
  const tesisB = await createThesis({
    studentProfileId: est2.profile.id,
    programId: educacion.id,
    title: "Prácticas de lectura crítica mediadas por tecnología en posgrado",
    assignedDaysAgo: 120,
    directorId: director1.id,
    assignedById: coordinador.id,
  });

  // --- Escenario C: ALERTA (0 asesorías, supera el umbral crítico) ---------
  const tesisC = await createThesis({
    studentProfileId: est3.profile.id,
    programId: educacion.id,
    title: "Acompañamiento docente y permanencia estudiantil en maestrías virtuales",
    assignedDaysAgo: 70,
    directorId: director2.id,
    assignedById: coordinador.id,
  });

  // --- Escenario D: asesoría programada que nadie confirmó ------------------
  const tesisD = await createThesis({
    studentProfileId: est4.profile.id,
    programId: educacion.id,
    title: "Formación de directivos escolares en contextos de alta vulnerabilidad",
    assignedDaysAgo: 100,
    directorId: director2.id,
    assignedById: coordinador.id,
  });

  // --- Escenario E: trabajo sin director asignado todavía -------------------
  await createThesis({
    studentProfileId: est5.profile.id,
    programId: educacion.id,
    title: "Currículo intercultural en instituciones de frontera",
    assignedDaysAgo: null,
    assignedById: coordinador.id,
  });

  // --- Escenario F: cumple el mínimo y tiene próxima cita ------------------
  const tesisF = await createThesis({
    studentProfileId: est6.profile.id,
    programId: educacion.id,
    title: "Evaluación de programas de bienestar universitario",
    assignedDaysAgo: 90,
    directorId: director1.id,
    assignedById: coordinador.id,
  });

  // --- Programa ajeno: nunca debe verlo la coordinación de MED -------------
  const tesisIng = await createThesis({
    studentProfileId: estIng.profile.id,
    programId: ingenieria.id,
    title: "Control predictivo aplicado a microrredes con generación solar",
    assignedDaysAgo: 100,
    directorId: directorIng.id,
    assignedById: coordinadorIng.id,
  });

  console.log("→ Asesorías, asistencia y compromisos…");

  async function completedAdvisory(opts: {
    thesisId: string;
    periodId: string;
    daysAgo: number;
    topic: string;
    summary: string;
    directorId: string;
    studentUserId: string;
    commitments?: Array<{ description: string; dueInDays?: number; status?: "PENDING" | "COMPLETED" }>;
    nextInDays?: number;
  }) {
    const advisory = await prisma.advisory.create({
      data: {
        thesisId: opts.thesisId,
        periodId: opts.periodId,
        scheduledDate: day(-opts.daysAgo),
        actualDate: day(-opts.daysAgo),
        scheduledTime: "10:00",
        mode: opts.daysAgo % 2 === 0 ? "IN_PERSON" : "VIRTUAL",
        status: "COMPLETED",
        topic: opts.topic,
        summary: opts.summary,
        nextAdvisoryDate: opts.nextInDays ? day(opts.nextInDays) : null,
        createdById: opts.directorId,
        confirmedById: opts.directorId,
        confirmedAt: day(-opts.daysAgo),
        createdAt: day(-opts.daysAgo - 5),
        attendances: {
          create: [
            { userId: opts.studentUserId, roleAtMeeting: "STUDENT", attended: true },
            { userId: opts.directorId, roleAtMeeting: "DIRECTOR", attended: true },
          ],
        },
      },
    });

    for (const commitment of opts.commitments ?? []) {
      await prisma.advisoryCommitment.create({
        data: {
          advisoryId: advisory.id,
          description: commitment.description,
          responsibleUserId: opts.studentUserId,
          dueDate: commitment.dueInDays ? day(commitment.dueInDays) : null,
          status: commitment.status ?? "PENDING",
          completedAt: commitment.status === "COMPLETED" ? day(-opts.daysAgo + 3) : null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: opts.directorId,
        action: "ADVISORY_COMPLETED",
        entityType: "Advisory",
        entityId: advisory.id,
        metadata: { thesisId: opts.thesisId },
        createdAt: day(-opts.daysAgo),
      },
    });

    return advisory;
  }

  async function scheduledAdvisory(opts: {
    thesisId: string;
    periodId: string;
    inDays: number;
    topic: string;
    directorId: string;
  }) {
    return prisma.advisory.create({
      data: {
        thesisId: opts.thesisId,
        periodId: opts.periodId,
        scheduledDate: day(opts.inDays),
        scheduledTime: "09:00",
        mode: "VIRTUAL",
        status: "SCHEDULED",
        topic: opts.topic,
        createdById: opts.directorId,
      },
    });
  }

  // Escenario A: dos asesorías cumplidas y próxima cita agendada.
  await completedAdvisory({
    thesisId: tesisA.id,
    periodId: periodo.id,
    daysAgo: 26,
    topic: "Delimitación del problema y objetivos",
    summary: "Se ajustó el objetivo general y se acotó la muestra a tres instituciones.",
    directorId: director1.id,
    studentUserId: est1.user.id,
    commitments: [
      { description: "Reescribir el objetivo general", status: "COMPLETED" },
      { description: "Enviar el consentimiento informado a las instituciones", dueInDays: -5, status: "COMPLETED" },
    ],
  });
  await completedAdvisory({
    thesisId: tesisA.id,
    periodId: periodo.id,
    daysAgo: 9,
    topic: "Diseño de los instrumentos de recolección",
    summary: "Revisión de la rúbrica y del guion de entrevista semiestructurada.",
    directorId: director1.id,
    studentUserId: est1.user.id,
    nextInDays: 18,
    commitments: [{ description: "Pilotear la entrevista con dos docentes", dueInDays: 12 }],
  });
  await scheduledAdvisory({
    thesisId: tesisA.id,
    periodId: periodo.id,
    inDays: 18,
    topic: "Resultados del pilotaje",
    directorId: director1.id,
  });

  // Escenario B: una sola asesoría y más de 30 días sin actividad.
  await completedAdvisory({
    thesisId: tesisB.id,
    periodId: periodo.id,
    daysAgo: 32,
    topic: "Revisión del estado del arte",
    summary: "Se identificaron tres vacíos de investigación y se depuró la bibliografía.",
    directorId: director1.id,
    studentUserId: est2.user.id,
    commitments: [{ description: "Entregar la matriz bibliográfica depurada", dueInDays: -10 }],
  });

  // Escenario C: sin ninguna asesoría desde la asignación del director.
  // (no se crea ninguna asesoría a propósito)

  // Escenario D: una asesoría cumplida y otra programada que ya venció.
  await completedAdvisory({
    thesisId: tesisD.id,
    periodId: periodo.id,
    daysAgo: 24,
    topic: "Encuadre metodológico",
    summary: "Se definió el enfoque mixto y el alcance del estudio.",
    directorId: director2.id,
    studentUserId: est4.user.id,
    commitments: [{ description: "Redactar el capítulo metodológico", dueInDays: 4 }],
  });
  await prisma.advisory.create({
    data: {
      thesisId: tesisD.id,
      periodId: periodo.id,
      scheduledDate: day(-12),
      scheduledTime: "15:00",
      mode: "VIRTUAL",
      status: "SCHEDULED",
      topic: "Avance del capítulo metodológico",
      createdById: director2.id,
      createdAt: day(-20),
    },
  });

  // Escenario F: cumple el mínimo y tiene próxima cita.
  await completedAdvisory({
    thesisId: tesisF.id,
    periodId: periodo.id,
    daysAgo: 30,
    topic: "Definición de la muestra",
    summary: "Se acordó trabajar con las cohortes 2024 y 2025.",
    directorId: director1.id,
    studentUserId: est6.user.id,
  });
  await completedAdvisory({
    thesisId: tesisF.id,
    periodId: periodo.id,
    daysAgo: 5,
    topic: "Análisis preliminar de resultados",
    summary: "Revisión de las tablas de frecuencia y primeros hallazgos.",
    directorId: director1.id,
    studentUserId: est6.user.id,
    nextInDays: 21,
    commitments: [{ description: "Preparar la discusión de resultados", dueInDays: 18 }],
  });
  await scheduledAdvisory({
    thesisId: tesisF.id,
    periodId: periodo.id,
    inDays: 21,
    topic: "Discusión de resultados",
    directorId: director1.id,
  });

  // Programa ajeno.
  await completedAdvisory({
    thesisId: tesisIng.id,
    periodId: periodoIng.id,
    daysAgo: 15,
    topic: "Definición del banco de pruebas",
    summary: "Se acordó el montaje del simulador de la microrred.",
    directorId: directorIng.id,
    studentUserId: estIng.user.id,
  });

  console.log("→ Calculando alertas iniciales…");
  const theses = await prisma.thesis.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const thesis of theses) {
    await syncThesisAlerts(thesis.id);
  }

  const alertCount = await prisma.alert.count({ where: { status: "ACTIVE" } });

  console.log("\n✔ Seed completado");
  console.log(`  Programas: 2 · Trabajos: ${theses.length} · Alertas activas: ${alertCount}`);
  console.log("\n  Credenciales de demostración:");
  console.log(`    admin@gradtrack.test          ${PASSWORDS.admin}`);
  console.log(`    coordinacion@gradtrack.test   ${PASSWORDS.coordinador}`);
  console.log(`    director1@gradtrack.test      ${PASSWORDS.director}`);
  console.log(`    director2@gradtrack.test      ${PASSWORDS.director}`);
  console.log(`    estudiante1@gradtrack.test    ${PASSWORDS.estudiante}  (al día)`);
  console.log(`    estudiante2@gradtrack.test    ${PASSWORDS.estudiante}  (seguimiento)`);
  console.log(`    estudiante3@gradtrack.test    ${PASSWORDS.estudiante}  (alerta)`);
  console.log(`    admin usa ${admin.email}\n`);
}

main()
  .catch((error) => {
    console.error("✖ El seed falló:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
