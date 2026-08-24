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
/** Día calendario (para columnas `date`). */
const day = (offset: number): Date => {
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return new Date(base.getTime() + offset * DAY);
};

/**
 * Instante para columnas `DateTime`: mediodía UTC, es decir las 07:00 en
 * Bogotá. Usar medianoche UTC haría que el historial mostrara la hora del día
 * anterior en la zona institucional.
 */
const stamp = (offset: number): Date => new Date(day(offset).getTime() + 12 * 3600 * 1000);

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

  // Cuenta recién creada por administración: entra con una contraseña temporal
  // y el sistema la obliga a cambiarla. Sirve para demostrar ese flujo.
  await prisma.user.create({
    data: {
      name: "Rocío Palacios Meza",
      email: "nuevo.docente@gradtrack.test",
      passwordHash: await hash("Aula2026"),
      role: "DIRECTOR",
      mustChangePassword: true,
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

  // Primer semestre: el director se asigna al finalizar, así que aún no tiene
  // trabajo de grado. Sirve para demostrar el flujo de asignación.
  await createStudent({
    name: "Camila Andrea Torres",
    email: "estudiante7@gradtrack.test",
    code: "MED-2026-019",
    semester: 1,
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
        assignedAt: opts.assignedDaysAgo === null ? null : stamp(-opts.assignedDaysAgo),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: opts.assignedById,
        action: "THESIS_CREATED",
        entityType: "Thesis",
        entityId: thesis.id,
        metadata: { title: thesis.title },
        createdAt: opts.assignedDaysAgo === null ? new Date() : stamp(-opts.assignedDaysAgo),
      },
    });

    if (opts.directorId) {
      const supervision = await prisma.thesisSupervision.create({
        data: {
          thesisId: thesis.id,
          userId: opts.directorId,
          type: "DIRECTOR",
          assignedById: opts.assignedById,
          startedAt: stamp(-(opts.assignedDaysAgo ?? 0)),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: opts.assignedById,
          action: "DIRECTOR_ASSIGNED",
          entityType: "ThesisSupervision",
          entityId: supervision.id,
          metadata: { thesisId: thesis.id, newUserId: opts.directorId },
          createdAt: stamp(-(opts.assignedDaysAgo ?? 0)),
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
          startedAt: stamp(-(opts.assignedDaysAgo ?? 0)),
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
        confirmedAt: stamp(-opts.daysAgo),
        createdAt: stamp(-opts.daysAgo - 5),
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
          completedAt: commitment.status === "COMPLETED" ? stamp(-opts.daysAgo + 3) : null,
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
        createdAt: stamp(-opts.daysAgo),
      },
    });

    return advisory;
  }

  /** Asesoría que no se realizó, con su motivo. */
  async function notCompletedAdvisory(opts: {
    thesisId: string;
    periodId: string;
    daysAgo: number;
    topic: string;
    reason: "STUDENT_ABSENT" | "DIRECTOR_ABSENT" | "CANCELLED_BY_AGREEMENT" | "TECHNICAL_ISSUE" | "OTHER";
    observations: string;
    directorId: string;
    studentUserId: string;
  }) {
    const advisory = await prisma.advisory.create({
      data: {
        thesisId: opts.thesisId,
        periodId: opts.periodId,
        scheduledDate: day(-opts.daysAgo),
        scheduledTime: "14:00",
        mode: "VIRTUAL",
        status: "NOT_COMPLETED",
        topic: opts.topic,
        notCompletedReason: opts.reason,
        observations: opts.observations,
        createdById: opts.directorId,
        confirmedById: opts.directorId,
        confirmedAt: stamp(-opts.daysAgo + 1),
        createdAt: stamp(-opts.daysAgo - 6),
        attendances: {
          create: [
            {
              userId: opts.studentUserId,
              roleAtMeeting: "STUDENT",
              attended: opts.reason !== "STUDENT_ABSENT",
            },
            {
              userId: opts.directorId,
              roleAtMeeting: "DIRECTOR",
              attended: opts.reason !== "DIRECTOR_ABSENT",
            },
          ],
        },
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: opts.directorId,
        action: "ADVISORY_NOT_COMPLETED",
        entityType: "Advisory",
        entityId: advisory.id,
        metadata: { thesisId: opts.thesisId, reason: opts.reason },
        createdAt: stamp(-opts.daysAgo + 1),
      },
    });
    return advisory;
  }

  /** Asesoría reprogramada (la cita original) o cancelada. */
  async function closedAdvisory(opts: {
    thesisId: string;
    periodId: string;
    daysAgo: number;
    topic: string;
    status: "RESCHEDULED" | "CANCELLED";
    directorId: string;
  }) {
    return prisma.advisory.create({
      data: {
        thesisId: opts.thesisId,
        periodId: opts.periodId,
        scheduledDate: day(-opts.daysAgo),
        scheduledTime: "11:00",
        mode: "IN_PERSON",
        status: opts.status,
        topic: opts.topic,
        createdById: opts.directorId,
        confirmedById: opts.directorId,
        confirmedAt: stamp(-opts.daysAgo),
        createdAt: stamp(-opts.daysAgo - 8),
      },
    });
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
      createdAt: stamp(-20),
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

  // ---------------------------------------------------------------------
  // Estados de asesoría que faltaban por representar
  // ---------------------------------------------------------------------
  console.log("→ Asesorías no realizadas, canceladas y reprogramadas…");

  // Andrés arrastra una inasistencia y una cita cancelada de común acuerdo.
  await notCompletedAdvisory({
    thesisId: tesisB.id,
    periodId: periodo.id,
    daysAgo: 18,
    topic: "Revisión de la matriz bibliográfica",
    reason: "STUDENT_ABSENT",
    observations: "El estudiante avisó el mismo día que no podría asistir.",
    directorId: director1.id,
    studentUserId: est2.user.id,
  });
  await closedAdvisory({
    thesisId: tesisB.id,
    periodId: periodo.id,
    daysAgo: 11,
    topic: "Reprogramación por cruce de horario",
    status: "CANCELLED",
    directorId: director1.id,
  });

  // Mateo tuvo una cita reprogramada antes de la que quedó vencida.
  await closedAdvisory({
    thesisId: tesisD.id,
    periodId: periodo.id,
    daysAgo: 20,
    topic: "Avance del capítulo metodológico",
    status: "RESCHEDULED",
    directorId: director2.id,
  });

  // Diana: dos intentos fallidos explican por qué no tiene ninguna asesoría.
  await notCompletedAdvisory({
    thesisId: tesisC.id,
    periodId: periodo.id,
    daysAgo: 40,
    topic: "Primera reunión de encuadre",
    reason: "STUDENT_ABSENT",
    observations: "No se presentó ni respondió a los correos.",
    directorId: director2.id,
    studentUserId: est3.user.id,
  });
  await notCompletedAdvisory({
    thesisId: tesisC.id,
    periodId: periodo.id,
    daysAgo: 22,
    topic: "Segundo intento de encuadre",
    reason: "TECHNICAL_ISSUE",
    observations: "Falla de conexión en la sede; no se pudo retomar.",
    directorId: director2.id,
    studentUserId: est3.user.id,
  });

  // Un compromiso cancelado, para ver el tercer estado.
  const compromisoDeAndres = await prisma.advisoryCommitment.findFirst({
    where: { advisory: { thesisId: tesisB.id }, status: "PENDING" },
    select: { id: true },
  });
  if (compromisoDeAndres) {
    await prisma.advisoryCommitment.update({
      where: { id: compromisoDeAndres.id },
      data: { status: "CANCELLED" },
    });
  }

  // ---------------------------------------------------------------------
  // Cambio de director: el histórico de supervisión visible en la ficha
  // ---------------------------------------------------------------------
  console.log("→ Historial de supervisión…");

  const est8 = await createStudent({
    name: "Natalia Guerrero Ríos",
    email: "estudiante8@gradtrack.test",
    code: "MED-2025-052",
    semester: 3,
    cohortId: c2025_2!.id,
    programId: educacion.id,
  });

  const tesisHistorial = await createThesis({
    studentProfileId: est8.profile.id,
    programId: educacion.id,
    title: "Convivencia escolar y mediación de conflictos en la básica secundaria",
    assignedDaysAgo: 150,
    directorId: director2.id,
    assignedById: coordinador.id,
  });

  // El primer director dejó el trabajo hace 40 días y entró otro.
  await prisma.thesisSupervision.updateMany({
    where: { thesisId: tesisHistorial.id, type: "DIRECTOR" },
    data: { active: false, endedAt: stamp(-40) },
  });
  const nuevaDireccion = await prisma.thesisSupervision.create({
    data: {
      thesisId: tesisHistorial.id,
      userId: director1.id,
      type: "DIRECTOR",
      assignedById: coordinador.id,
      startedAt: stamp(-40),
      createdAt: stamp(-40),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: coordinador.id,
      action: "DIRECTOR_CHANGED",
      entityType: "ThesisSupervision",
      entityId: nuevaDireccion.id,
      metadata: {
        thesisId: tesisHistorial.id,
        previousUserId: director2.id,
        newUserId: director1.id,
        reason: "Traslado del docente a otra línea de investigación",
      },
      createdAt: stamp(-40),
    },
  });
  await completedAdvisory({
    thesisId: tesisHistorial.id,
    periodId: periodo.id,
    daysAgo: 55,
    topic: "Ajuste del marco teórico",
    summary: "Última sesión con la dirección anterior.",
    directorId: director2.id,
    studentUserId: est8.user.id,
  });
  await completedAdvisory({
    thesisId: tesisHistorial.id,
    periodId: periodo.id,
    daysAgo: 12,
    topic: "Empalme con la nueva dirección",
    summary: "Se revisó el estado del trabajo y se acordó el plan del semestre.",
    directorId: director1.id,
    studentUserId: est8.user.id,
    nextInDays: 16,
    commitments: [{ description: "Reescribir el capítulo 2 con la nueva ruta", dueInDays: 10 }],
  });
  await scheduledAdvisory({
    thesisId: tesisHistorial.id,
    periodId: periodo.id,
    inDays: 16,
    topic: "Revisión del capítulo 2",
    directorId: director1.id,
  });

  // ---------------------------------------------------------------------
  // Trabajos que ya no están activos
  // ---------------------------------------------------------------------
  console.log("→ Trabajos suspendidos, terminados y cancelados…");

  const est9 = await createStudent({
    name: "Ricardo Peña Osorio",
    email: "estudiante9@gradtrack.test",
    code: "MED-2024-008",
    semester: 3,
    cohortId: c2025_1!.id,
    programId: educacion.id,
  });
  const tesisTerminada = await createThesis({
    studentProfileId: est9.profile.id,
    programId: educacion.id,
    title: "Liderazgo pedagógico y clima institucional en colegios oficiales",
    assignedDaysAgo: 300,
    directorId: director1.id,
    assignedById: coordinador.id,
  });
  await completedAdvisory({
    thesisId: tesisTerminada.id,
    periodId: periodo.id,
    daysAgo: 60,
    topic: "Revisión final del documento",
    summary: "Documento aprobado para sustentación.",
    directorId: director1.id,
    studentUserId: est9.user.id,
  });
  await prisma.thesis.update({
    where: { id: tesisTerminada.id },
    data: { status: "COMPLETED" },
  });

  const est10 = await createStudent({
    name: "Gloria Marín Betancur",
    email: "estudiante10@gradtrack.test",
    code: "MED-2025-061",
    semester: 2,
    cohortId: c2025_2!.id,
    programId: educacion.id,
  });
  const tesisSuspendida = await createThesis({
    studentProfileId: est10.profile.id,
    programId: educacion.id,
    title: "Educación inclusiva y ajustes razonables en el aula",
    assignedDaysAgo: 130,
    directorId: director2.id,
    assignedById: coordinador.id,
  });
  await prisma.thesis.update({
    where: { id: tesisSuspendida.id },
    data: { status: "SUSPENDED" },
  });

  const est11 = await createStudent({
    name: "Fernando Lozano Cárdenas",
    email: "estudiante11@gradtrack.test",
    code: "MED-2024-017",
    semester: 2,
    cohortId: c2025_1!.id,
    programId: educacion.id,
  });
  const tesisCancelada = await createThesis({
    studentProfileId: est11.profile.id,
    programId: educacion.id,
    title: "Uso de datos escolares para la toma de decisiones directivas",
    assignedDaysAgo: 200,
    directorId: codirector.id,
    assignedById: coordinador.id,
  });
  await prisma.thesis.update({
    where: { id: tesisCancelada.id },
    data: { status: "CANCELLED" },
  });

  // ---------------------------------------------------------------------
  // Volumen: suficientes trabajos para ver el filtrado y la paginación
  // ---------------------------------------------------------------------
  console.log("→ Cohorte completa para ver filtros y paginación…");

  const directoresMed = [director1.id, director2.id, codirector.id];
  const cohortesMed = [c2025_1!.id, c2025_2!.id, c2026_1!.id];

  const cohorte: Array<{
    name: string;
    code: string;
    title: string;
    semester: number;
    /** Días atrás de cada asesoría realizada. */
    completed: number[];
    scheduledIn?: number;
  }> = [
    { name: "Adriana Mejía Solís", code: "MED-2025-071", title: "Alfabetización académica en programas de posgrado", semester: 3, completed: [21, 4], scheduledIn: 24 },
    { name: "Jorge Iván Salazar", code: "MED-2025-072", title: "Evaluación docente y desarrollo profesional situado", semester: 3, completed: [33], scheduledIn: 9 },
    { name: "Claudia Rueda Amaya", code: "MED-2025-073", title: "Prácticas pedagógicas en aulas multigrado", semester: 2, completed: [14, 2] },
    { name: "Hugo Bermúdez Rivas", code: "MED-2025-074", title: "Formación ciudadana y proyectos de aula", semester: 2, completed: [], scheduledIn: 6 },
    { name: "Lina María Cortés", code: "MED-2025-075", title: "Tecnologías educativas en zonas de baja conectividad", semester: 3, completed: [28, 7], scheduledIn: 20 },
    { name: "Esteban Naranjo Gil", code: "MED-2026-081", title: "Acompañamiento a maestros noveles", semester: 2, completed: [37] },
    { name: "Paola Andrea Vega", code: "MED-2026-082", title: "Currículo y contexto en instituciones rurales", semester: 2, completed: [10, 3], scheduledIn: 27 },
    { name: "Daniel Restrepo Cano", code: "MED-2026-083", title: "Gestión del tiempo escolar y aprendizaje", semester: 2, completed: [48] },
    { name: "Marta Lucía Ospina", code: "MED-2026-084", title: "Lectura en voz alta y comprensión lectora", semester: 1, completed: [16, 5], scheduledIn: 30 },
    { name: "Álvaro Jiménez Duque", code: "MED-2026-085", title: "Convivencia y resolución pacífica de conflictos", semester: 2, completed: [24, 9], scheduledIn: 18 },
    { name: "Sandra Milena Botero", code: "MED-2026-086", title: "Educación ambiental en la básica primaria", semester: 1, completed: [], scheduledIn: 11 },
    { name: "Germán Castaño Ruiz", code: "MED-2026-087", title: "Innovación curricular en educación media técnica", semester: 3, completed: [19, 6], scheduledIn: 22 },
    { name: "Yolanda Muñoz Parra", code: "MED-2026-088", title: "Familia y escuela: alianzas para el aprendizaje", semester: 2, completed: [41] },
    { name: "Iván Darío Zuluaga", code: "MED-2026-089", title: "Evaluación formativa en matemáticas escolares", semester: 3, completed: [13, 1], scheduledIn: 26 },
  ];

  for (const [index, spec] of cohorte.entries()) {
    const estudiante = await createStudent({
      name: spec.name,
      email: `cohorte${index + 1}@gradtrack.test`,
      code: spec.code,
      semester: spec.semester,
      cohortId: cohortesMed[index % cohortesMed.length]!,
      programId: educacion.id,
    });
    const directorId = directoresMed[index % directoresMed.length]!;
    const trabajo = await createThesis({
      studentProfileId: estudiante.profile.id,
      programId: educacion.id,
      title: spec.title,
      assignedDaysAgo: 110 + index,
      directorId,
      assignedById: coordinador.id,
    });

    for (const [i, daysAgo] of spec.completed.entries()) {
      await completedAdvisory({
        thesisId: trabajo.id,
        periodId: periodo.id,
        daysAgo,
        topic: i === 0 ? "Encuadre y plan de trabajo del semestre" : "Revisión de avances",
        summary:
          i === 0
            ? "Se acordó el alcance del semestre y el cronograma de entregas."
            : "Se revisaron los avances y se ajustó el cronograma.",
        directorId,
        studentUserId: estudiante.user.id,
        nextInDays: spec.scheduledIn,
        commitments:
          i === 0 ? [{ description: "Entregar el cronograma ajustado", dueInDays: 7 }] : undefined,
      });
    }

    if (spec.scheduledIn) {
      await scheduledAdvisory({
        thesisId: trabajo.id,
        periodId: periodo.id,
        inDays: spec.scheduledIn,
        topic: "Seguimiento del trabajo de grado",
        directorId,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Segundo programa de la misma coordinación: mínimo en riesgo y la regla
  // de "próxima asesoría obligatoria"
  // ---------------------------------------------------------------------
  console.log("→ Especialización con cierre próximo…");

  const especializacion = await prisma.program.create({
    data: {
      name: "Especialización en Gestión Educativa",
      code: "EGE",
      level: "SPECIALIZATION",
      settings: {
        create: {
          minimumAdvisoriesPerPeriod: 2,
          warningDaysWithoutAdvisory: 30,
          criticalDaysWithoutAdvisory: 45,
          riskWindowDaysBeforeDeadline: 28,
          missedAdvisoryGraceDays: 7,
          // Este programa sí exige dejar acordada la próxima fecha.
          requireNextAdvisoryDate: true,
          alertsEnabled: true,
        },
      },
    },
  });

  await prisma.programMembership.createMany({
    data: [
      { userId: coordinador.id, programId: especializacion.id, role: "COORDINADOR" },
      { userId: admin.id, programId: especializacion.id, role: "ADMIN" },
      { userId: director1.id, programId: especializacion.id, role: "DIRECTOR" },
      { userId: codirector.id, programId: especializacion.id, role: "DIRECTOR" },
    ],
  });

  const periodoEge = await prisma.academicPeriod.create({
    data: {
      programId: especializacion.id,
      name: "2026-2",
      startDate: day(-100),
      endDate: day(22),
      advisoryDeadline: day(18),
      active: true,
      status: "ACTIVE",
    },
  });

  const cohorteEge = await prisma.cohort.create({
    data: { name: "2026-1", startYear: 2026, startPeriod: 1, programId: especializacion.id },
  });

  const egeSpecs = [
    {
      name: "Beatriz Ocampo Salas",
      email: "ege1@gradtrack.test",
      code: "EGE-2026-001",
      title: "Modelo de gestión por procesos para instituciones educativas",
      completed: [30],
      nextAgreed: false,
    },
    {
      name: "Sergio Nieto Ramírez",
      email: "ege2@gradtrack.test",
      code: "EGE-2026-002",
      title: "Planeación estratégica participativa en colegios oficiales",
      completed: [40, 12],
      nextAgreed: false,
    },
    {
      name: "Carolina Franco Díaz",
      email: "ege3@gradtrack.test",
      code: "EGE-2026-003",
      title: "Indicadores de calidad en la gestión directiva",
      completed: [26, 5],
      nextAgreed: true,
    },
  ];

  for (const [index, spec] of egeSpecs.entries()) {
    const estudiante = await createStudent({
      name: spec.name,
      email: spec.email,
      code: spec.code,
      semester: 2,
      cohortId: cohorteEge.id,
      programId: especializacion.id,
    });
    const directorId = index % 2 === 0 ? director1.id : codirector.id;
    const trabajo = await createThesis({
      studentProfileId: estudiante.profile.id,
      programId: especializacion.id,
      title: spec.title,
      assignedDaysAgo: 95,
      directorId,
      assignedById: coordinador.id,
    });

    for (const [i, daysAgo] of spec.completed.entries()) {
      const esUltima = i === spec.completed.length - 1;
      await completedAdvisory({
        thesisId: trabajo.id,
        periodId: periodoEge.id,
        daysAgo,
        topic: i === 0 ? "Delimitación del problema" : "Avance del diagnóstico institucional",
        summary: "Sesión de trabajo sobre el documento en curso.",
        directorId,
        studentUserId: estudiante.user.id,
        nextInDays: esUltima && spec.nextAgreed ? 14 : undefined,
      });
    }

    if (spec.nextAgreed) {
      await scheduledAdvisory({
        thesisId: trabajo.id,
        periodId: periodoEge.id,
        inDays: 14,
        topic: "Revisión del diagnóstico",
        directorId,
      });
    }
  }

  // El periodo activo de Ingeniería ya pasó su fecha límite: así se ve la
  // alerta de mínimo incumplido en un programa que no ha abierto el siguiente.
  await prisma.academicPeriod.update({
    where: { id: periodoIng.id },
    data: { endDate: day(-4), advisoryDeadline: day(-8) },
  });

  console.log("→ Calculando alertas iniciales…");
  const theses = await prisma.thesis.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const thesis of theses) {
    await syncThesisAlerts(thesis.id);
  }

  // Una alerta ya gestionada por la coordinación (sigue activa, con su nota)
  // y otra descartada: así se ven los tres estados en la bandeja.
  const alertaParaGestionar = await prisma.alert.findFirst({
    where: { status: "ACTIVE", thesisId: tesisC.id },
    select: { id: true },
  });
  if (alertaParaGestionar) {
    await prisma.alert.update({
      where: { id: alertaParaGestionar.id },
      data: {
        managedAt: stamp(-3),
        managedById: coordinador.id,
        managementNote:
          "Cité a la estudiante y al director el 3 de este mes. Se comprometieron a reunirse esta semana.",
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: coordinador.id,
        action: "ALERT_MANAGED",
        entityType: "Alert",
        entityId: alertaParaGestionar.id,
        metadata: { thesisId: tesisC.id },
        createdAt: stamp(-3),
      },
    });
  }

  // Un caso donde la coordinación decide que la alerta no aplica: el
  // estudiante está en comisión de estudios y la inactividad está justificada.
  const alertaParaDescartar = await prisma.alert.findFirst({
    where: {
      status: "ACTIVE",
      type: "INACTIVITY",
      thesis: { student: { studentCode: "MED-2026-083" } },
    },
    select: { id: true },
  });
  if (alertaParaDescartar) {
    await prisma.alert.update({
      where: { id: alertaParaDescartar.id },
      data: {
        status: "DISMISSED",
        resolvedAt: stamp(-6),
        resolvedById: coordinador.id,
        managementNote:
          "El estudiante está en comisión de estudios aprobada por el comité; la inactividad está justificada.",
      },
    });
  }

  const programCount = await prisma.program.count();
  const alertCount = await prisma.alert.count({ where: { status: "ACTIVE" } });

  console.log("\n✔ Seed completado");
  console.log(
    `  Programas: ${programCount} · Trabajos: ${theses.length} · Alertas activas: ${alertCount}`,
  );
  console.log("\n  Credenciales de demostración:");
  console.log(`    admin@gradtrack.test          ${PASSWORDS.admin}`);
  console.log(`    coordinacion@gradtrack.test   ${PASSWORDS.coordinador}`);
  console.log(`    director1@gradtrack.test      ${PASSWORDS.director}`);
  console.log(`    director2@gradtrack.test      ${PASSWORDS.director}`);
  console.log(`    estudiante1@gradtrack.test    ${PASSWORDS.estudiante}  (al día)`);
  console.log(`    estudiante2@gradtrack.test    ${PASSWORDS.estudiante}  (seguimiento)`);
  console.log(`    estudiante3@gradtrack.test    ${PASSWORDS.estudiante}  (alerta)`);
  console.log("    nuevo.docente@gradtrack.test  Aula2026        (contraseña temporal)");
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
