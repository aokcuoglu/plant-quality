-- CreateEnum
CREATE TYPE "ActionOwner" AS ENUM ('OEM', 'SUPPLIER', 'NONE');

-- AlterEnum
ALTER TYPE "DefectEventType" ADD VALUE 'OWNER_CHANGED';
ALTER TYPE "DefectEventType" ADD VALUE 'SUPPLIER_ASSIGNEE_CHANGED';
ALTER TYPE "DefectEventType" ADD VALUE 'DUE_DATE_CHANGED';

-- AlterTable
ALTER TABLE "defects"
ADD COLUMN "oem_owner_id" TEXT,
ADD COLUMN "supplier_assignee_id" TEXT,
ADD COLUMN "supplier_response_due_at" TIMESTAMP(3),
ADD COLUMN "eight_d_submission_due_at" TIMESTAMP(3),
ADD COLUMN "oem_review_due_at" TIMESTAMP(3),
ADD COLUMN "revision_due_at" TIMESTAMP(3),
ADD COLUMN "current_action_owner" "ActionOwner" NOT NULL DEFAULT 'SUPPLIER';

-- Backfill action owner from current status for existing records.
UPDATE "defects"
SET "current_action_owner" = CASE
  WHEN "status" = 'WAITING_APPROVAL' THEN 'OEM'::"ActionOwner"
  WHEN "status" = 'RESOLVED' THEN 'NONE'::"ActionOwner"
  ELSE 'SUPPLIER'::"ActionOwner"
END;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_oem_owner_id_fkey" FOREIGN KEY ("oem_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_supplier_assignee_id_fkey" FOREIGN KEY ("supplier_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
