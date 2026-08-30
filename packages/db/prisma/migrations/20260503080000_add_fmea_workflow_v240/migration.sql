-- Step 1: Add new FmeaStatus enum values
ALTER TYPE "FmeaStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "FmeaStatus" ADD VALUE 'SUPPLIER_IN_PROGRESS';
ALTER TYPE "FmeaStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "FmeaStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "FmeaStatus" ADD VALUE 'REVISION_REQUIRED';
ALTER TYPE "FmeaStatus" ADD VALUE 'REJECTED';
ALTER TYPE "FmeaStatus" ADD VALUE 'ARCHIVED';
ALTER TYPE "FmeaStatus" ADD VALUE 'CANCELLED';

-- Step 2: Create FmeaActionStatus enum
CREATE TYPE "FmeaActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Step 3: Add new DefectEventType values
ALTER TYPE "DefectEventType" ADD VALUE 'FMEA_SUBMITTED';
ALTER TYPE "DefectEventType" ADD VALUE 'FMEA_REJECTED';
ALTER TYPE "DefectEventType" ADD VALUE 'FMEA_REVISION_REQUESTED';
ALTER TYPE "DefectEventType" ADD VALUE 'FMEA_CANCELLED';

-- Step 4: Add new NotificationType values
ALTER TYPE "NotificationType" ADD VALUE 'FMEA_REVIEW_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'FMEA_STATUS_CHANGED';

-- Step 5: Add new columns to fmeas table
ALTER TABLE "fmeas" ADD COLUMN "fmea_number" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "process_name" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "project_name" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "vehicle_model" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "revision" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "due_date" TIMESTAMP(3);
ALTER TABLE "fmeas" ADD COLUMN "reviewed_by_id" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "fmeas" ADD COLUMN "created_by_id" TEXT NOT NULL DEFAULT 'oem-quality';

-- Step 6: Make supplier_id nullable (OEM-only FMEAs)
ALTER TABLE "fmeas" ALTER COLUMN "supplier_id" DROP NOT NULL;

-- Step 7: Backfill fmea_number for existing rows
UPDATE "fmeas" SET "fmea_number" = 'FMEA-' || "id" WHERE "fmea_number" IS NULL;

-- Step 8: Add unique constraint on fmea_number
ALTER TABLE "fmeas" ADD CONSTRAINT "fmeas_fmea_number_key" UNIQUE ("fmea_number");

-- Step 9: Migrate existing statuses to new values
-- IN_REVIEW -> UNDER_REVIEW, REVISED -> REVISION_REQUIRED
UPDATE "fmeas" SET "status" = 'UNDER_REVIEW' WHERE "status" = 'IN_REVIEW';
UPDATE "fmeas" SET "status" = 'REVISION_REQUIRED' WHERE "status" = 'REVISED';

-- Step 10: Remove old enum values (can't be done in PostgreSQL without recreating enum)
-- IN_REVIEW and REVISED values are kept but no longer used in app code.
-- This is safe as PostgreSQL allows unused enum values.

-- Step 11: Add new indexes
CREATE INDEX "fmeas_oem_id_supplier_id_idx" ON "fmeas"("oem_id", "supplier_id");
CREATE INDEX "fmeas_oem_id_created_at_idx" ON "fmeas"("oem_id", "created_at");

-- Step 12: Add foreign key for reviewed_by_id and created_by_id
ALTER TABLE "fmeas" ADD CONSTRAINT "fmeas_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fmeas" ADD CONSTRAINT "fmeas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 13: Rename process_step to process_name (drop old, add new)
ALTER TABLE "fmeas" DROP COLUMN IF EXISTS "process_step";