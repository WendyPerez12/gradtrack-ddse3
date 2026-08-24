-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'USER_PASSWORD_CHANGED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordUpdatedAt" TIMESTAMP(3);
