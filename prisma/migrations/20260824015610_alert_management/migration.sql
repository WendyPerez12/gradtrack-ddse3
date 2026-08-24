-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_MANAGED';

-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "managedAt" TIMESTAMP(3),
ADD COLUMN     "managedById" TEXT,
ADD COLUMN     "managementNote" TEXT;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
