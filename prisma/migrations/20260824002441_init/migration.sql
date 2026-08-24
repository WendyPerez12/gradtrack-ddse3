-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COORDINADOR', 'DIRECTOR', 'CODIRECTOR', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "ProgramLevel" AS ENUM ('UNDERGRADUATE', 'SPECIALIZATION', 'MASTER', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ThesisStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupervisionType" AS ENUM ('DIRECTOR', 'CODIRECTOR');

-- CreateEnum
CREATE TYPE "AdvisoryMode" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AdvisoryStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'NOT_COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "NotCompletedReason" AS ENUM ('STUDENT_ABSENT', 'DIRECTOR_ABSENT', 'CANCELLED_BY_AGREEMENT', 'TECHNICAL_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingRole" AS ENUM ('STUDENT', 'DIRECTOR', 'CODIRECTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NO_FIRST_ADVISORY', 'INACTIVITY', 'MISSED_ADVISORY', 'NO_NEXT_ADVISORY', 'MINIMUM_ADVISORIES_RISK', 'MINIMUM_ADVISORIES_NOT_MET');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'THESIS_CREATED', 'THESIS_UPDATED', 'DIRECTOR_ASSIGNED', 'DIRECTOR_CHANGED', 'CODIRECTOR_ASSIGNED', 'CODIRECTOR_REMOVED', 'ADVISORY_CREATED', 'ADVISORY_UPDATED', 'ADVISORY_COMPLETED', 'ADVISORY_NOT_COMPLETED', 'ADVISORY_CANCELLED', 'COMMITMENT_CREATED', 'COMMITMENT_COMPLETED', 'SETTINGS_CHANGED', 'ALERT_RESOLVED', 'ALERT_DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ADVISORY_SCHEDULED', 'ADVISORY_RESCHEDULED', 'ADVISORY_COMPLETED', 'COMMITMENT_CREATED', 'ALERT_RAISED', 'SUPERVISION_ASSIGNED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" "ProgramLevel" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "advisoryDeadline" DATE,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "status" "PeriodStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "startPeriod" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT,
    "studentCode" TEXT NOT NULL,
    "currentSemester" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theses" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedAt" TIMESTAMP(3),
    "status" "ThesisStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_supervisions" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SupervisionType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_supervisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisories" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT,
    "actualDate" DATE,
    "mode" "AdvisoryMode" NOT NULL DEFAULT 'IN_PERSON',
    "status" "AdvisoryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "topic" TEXT NOT NULL,
    "summary" TEXT,
    "observations" TEXT,
    "notCompletedReason" "NotCompletedReason",
    "nextAdvisoryDate" DATE,
    "createdById" TEXT NOT NULL,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisory_attendances" (
    "id" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleAtMeeting" "MeetingRole" NOT NULL,
    "attended" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisory_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisory_commitments" (
    "id" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleUserId" TEXT,
    "dueDate" DATE,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "advisory_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_settings" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "minimumAdvisoriesPerPeriod" INTEGER NOT NULL DEFAULT 2,
    "warningDaysWithoutAdvisory" INTEGER NOT NULL DEFAULT 30,
    "criticalDaysWithoutAdvisory" INTEGER NOT NULL DEFAULT 45,
    "riskWindowDaysBeforeDeadline" INTEGER NOT NULL DEFAULT 28,
    "missedAdvisoryGraceDays" INTEGER NOT NULL DEFAULT 7,
    "requireNextAdvisoryDate" BOOLEAN NOT NULL DEFAULT false,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_key" ON "programs"("code");

-- CreateIndex
CREATE INDEX "programs_active_idx" ON "programs"("active");

-- CreateIndex
CREATE INDEX "program_memberships_programId_idx" ON "program_memberships"("programId");

-- CreateIndex
CREATE INDEX "program_memberships_userId_idx" ON "program_memberships"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "program_memberships_userId_programId_key" ON "program_memberships"("userId", "programId");

-- CreateIndex
CREATE INDEX "academic_periods_programId_status_idx" ON "academic_periods"("programId", "status");

-- CreateIndex
CREATE INDEX "academic_periods_active_idx" ON "academic_periods"("active");

-- CreateIndex
CREATE UNIQUE INDEX "academic_periods_programId_name_key" ON "academic_periods"("programId", "name");

-- CreateIndex
CREATE INDEX "cohorts_programId_idx" ON "cohorts"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_programId_name_key" ON "cohorts"("programId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_userId_key" ON "student_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_studentCode_key" ON "student_profiles"("studentCode");

-- CreateIndex
CREATE INDEX "student_profiles_programId_active_idx" ON "student_profiles"("programId", "active");

-- CreateIndex
CREATE INDEX "student_profiles_cohortId_idx" ON "student_profiles"("cohortId");

-- CreateIndex
CREATE INDEX "theses_programId_status_idx" ON "theses"("programId", "status");

-- CreateIndex
CREATE INDEX "theses_studentId_idx" ON "theses"("studentId");

-- CreateIndex
CREATE INDEX "thesis_supervisions_thesisId_active_idx" ON "thesis_supervisions"("thesisId", "active");

-- CreateIndex
CREATE INDEX "thesis_supervisions_userId_active_idx" ON "thesis_supervisions"("userId", "active");

-- CreateIndex
CREATE INDEX "thesis_supervisions_type_active_idx" ON "thesis_supervisions"("type", "active");

-- CreateIndex
CREATE INDEX "advisories_thesisId_status_idx" ON "advisories"("thesisId", "status");

-- CreateIndex
CREATE INDEX "advisories_periodId_status_idx" ON "advisories"("periodId", "status");

-- CreateIndex
CREATE INDEX "advisories_scheduledDate_idx" ON "advisories"("scheduledDate");

-- CreateIndex
CREATE INDEX "advisories_status_scheduledDate_idx" ON "advisories"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "advisory_attendances_advisoryId_idx" ON "advisory_attendances"("advisoryId");

-- CreateIndex
CREATE UNIQUE INDEX "advisory_attendances_advisoryId_userId_key" ON "advisory_attendances"("advisoryId", "userId");

-- CreateIndex
CREATE INDEX "advisory_commitments_advisoryId_idx" ON "advisory_commitments"("advisoryId");

-- CreateIndex
CREATE INDEX "advisory_commitments_status_idx" ON "advisory_commitments"("status");

-- CreateIndex
CREATE INDEX "advisory_commitments_responsibleUserId_status_idx" ON "advisory_commitments"("responsibleUserId", "status");

-- CreateIndex
CREATE INDEX "alerts_thesisId_status_idx" ON "alerts"("thesisId", "status");

-- CreateIndex
CREATE INDEX "alerts_status_severity_idx" ON "alerts"("status", "severity");

-- CreateIndex
CREATE INDEX "alerts_type_status_idx" ON "alerts"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "program_settings_programId_key" ON "program_settings"("programId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "program_memberships" ADD CONSTRAINT "program_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_memberships" ADD CONSTRAINT "program_memberships_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theses" ADD CONSTRAINT "theses_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_supervisions" ADD CONSTRAINT "thesis_supervisions_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_supervisions" ADD CONSTRAINT "thesis_supervisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_supervisions" ADD CONSTRAINT "thesis_supervisions_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisories" ADD CONSTRAINT "advisories_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisories" ADD CONSTRAINT "advisories_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisories" ADD CONSTRAINT "advisories_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisories" ADD CONSTRAINT "advisories_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_attendances" ADD CONSTRAINT "advisory_attendances_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "advisories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_attendances" ADD CONSTRAINT "advisory_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_commitments" ADD CONSTRAINT "advisory_commitments_advisoryId_fkey" FOREIGN KEY ("advisoryId") REFERENCES "advisories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisory_commitments" ADD CONSTRAINT "advisory_commitments_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_settings" ADD CONSTRAINT "program_settings_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Reglas de negocio aplicadas en la base (no solo en la capa de servicio).
-- Prisma no expresa índices únicos parciales, se agregan aquí.
-- ---------------------------------------------------------------------------

-- Un único director activo por trabajo de grado.
CREATE UNIQUE INDEX "thesis_supervisions_one_active_director"
  ON "thesis_supervisions" ("thesisId")
  WHERE "active" AND "type" = 'DIRECTOR';

-- Un único codirector activo por trabajo de grado.
CREATE UNIQUE INDEX "thesis_supervisions_one_active_codirector"
  ON "thesis_supervisions" ("thesisId")
  WHERE "active" AND "type" = 'CODIRECTOR';

-- Un único trabajo de grado activo por estudiante.
CREATE UNIQUE INDEX "theses_one_active_per_student"
  ON "theses" ("studentId")
  WHERE "status" = 'ACTIVE';

-- Un único periodo académico activo por programa.
CREATE UNIQUE INDEX "academic_periods_one_active_per_program"
  ON "academic_periods" ("programId")
  WHERE "active";

-- Una sola alerta ACTIVA por trabajo y tipo (evita duplicar al re-evaluar).
CREATE UNIQUE INDEX "alerts_one_active_per_thesis_type"
  ON "alerts" ("thesisId", "type")
  WHERE "status" = 'ACTIVE';
