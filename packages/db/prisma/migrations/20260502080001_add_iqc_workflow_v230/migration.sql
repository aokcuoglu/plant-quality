-- Step 1: Create new enum types (idempotent)
DO $$ BEGIN
  CREATE TYPE "IqcResult" AS ENUM ('ACCEPTED', 'CONDITIONAL_ACCEPTED', 'REJECTED', 'ON_HOLD', 'REWORK_REQUIRED', 'SORTING_REQUIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IqcInspectionType" AS ENUM ('RECEIVING_INSPECTION', 'FIRST_ARTICLE_INSPECTION', 'CONTAINMENT_INSPECTION', 'RE_INSPECTION', 'DOCK_AUDIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IqcChecklistResult" AS ENUM ('PENDING', 'OK', 'NOK', 'NA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Migrate existing status data to new values
UPDATE "iqc_reports" SET "status" = 'PLANNED' WHERE "status" = 'PENDING';
UPDATE "iqc_reports" SET "status" = 'COMPLETED' WHERE "status" IN ('PASSED', 'FAILED', 'CONDITIONALLY_ACCEPTED');

-- Step 3: Drop old IqcStatus enum (cascade to remove default dependency)
DO $$ BEGIN
  ALTER TABLE "iqc_reports" ALTER COLUMN "status" DROP DEFAULT;
  DROP TYPE "IqcStatus" CASCADE;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Step 4: Recreate IqcStatus with new values
CREATE TYPE "IqcStatus" AS ENUM ('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Step 5: Attach the new enum type to the status column
ALTER TABLE "iqc_reports" ALTER COLUMN "status" TYPE "IqcStatus" USING "status"::"IqcStatus";
ALTER TABLE "iqc_reports" ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- Step 6: Add new columns to iqc_reports (idempotent)
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "inspection_number" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "purchase_order" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "delivery_note" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "batch_number" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "quantity_received" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "inspection_quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "vehicle_model" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "project_name" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "inspection_type" "IqcInspectionType" NOT NULL DEFAULT 'RECEIVING_INSPECTION';
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "sampling_plan" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "result" "IqcResult";
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "linked_defect_id" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "iqc_reports" ADD COLUMN IF NOT EXISTS "completed_by_id" TEXT;

-- Step 7: Backfill inspection_number from id for existing records
UPDATE "iqc_reports" SET "inspection_number" = 'IQC-' || UPPER(SUBSTRING("id", 1, 8)) WHERE "inspection_number" IS NULL;

-- Step 8: Backfill created_by_id from inspector_id for existing records
UPDATE "iqc_reports" SET "created_by_id" = "inspector_id" WHERE "created_by_id" IS NULL AND "inspector_id" IS NOT NULL;

-- Step 9: Copy data from old quantity column to quantity_received
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iqc_reports' AND column_name = 'quantity') THEN
    UPDATE "iqc_reports" SET "quantity_received" = "quantity" WHERE "quantity" IS NOT NULL AND "quantity_received" = 0;
  END IF;
END $$;

-- Step 10: Set result based on old status values
UPDATE "iqc_reports" SET "result" = 'ACCEPTED'::"IqcResult" WHERE "status" = 'COMPLETED' AND "quantity_rejected" = 0 AND "result" IS NULL;
UPDATE "iqc_reports" SET "result" = 'REJECTED'::"IqcResult" WHERE "status" = 'COMPLETED' AND "quantity_rejected" > 0 AND "result" IS NULL;

-- Step 11: Make inspection_number NOT NULL and UNIQUE
ALTER TABLE "iqc_reports" ALTER COLUMN "inspection_number" SET NOT NULL;
ALTER TABLE "iqc_reports" DROP CONSTRAINT IF EXISTS "iqc_reports_inspection_number_key";
ALTER TABLE "iqc_reports" ADD CONSTRAINT "iqc_reports_inspection_number_key" UNIQUE ("inspection_number");

-- Step 12: Make created_by_id NOT NULL
UPDATE "iqc_reports" SET "created_by_id" = 'oem-quality' WHERE "created_by_id" IS NULL;
ALTER TABLE "iqc_reports" ALTER COLUMN "created_by_id" SET NOT NULL;

-- Step 13: Add unique constraint on linked_defect_id (partial index to allow multiple NULLs)
ALTER TABLE "iqc_reports" DROP CONSTRAINT IF EXISTS "iqc_reports_linked_defect_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "iqc_reports_linked_defect_id_key" ON "iqc_reports" ("linked_defect_id") WHERE "linked_defect_id" IS NOT NULL;

-- Step 14: Drop old defect_id column and copy data to linked_defect_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iqc_reports' AND column_name = 'defect_id') THEN
    UPDATE "iqc_reports" SET "linked_defect_id" = "defect_id" WHERE "linked_defect_id" IS NULL AND "defect_id" IS NOT NULL;
    ALTER TABLE "iqc_reports" DROP CONSTRAINT IF EXISTS "iqc_reports_defect_id_key";
    ALTER TABLE "iqc_reports" DROP COLUMN "defect_id";
  END IF;
END $$;

-- Step 15: Drop old quantity column (replaced by quantity_received)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iqc_reports' AND column_name = 'quantity') THEN
    ALTER TABLE "iqc_reports" DROP COLUMN "quantity";
  END IF;
END $$;

-- Step 16: Add foreign keys for new columns (idempotent)
ALTER TABLE "iqc_reports" DROP CONSTRAINT IF EXISTS "iqc_reports_linked_defect_id_fkey";
ALTER TABLE "iqc_reports" ADD CONSTRAINT "iqc_reports_linked_defect_id_fkey" FOREIGN KEY ("linked_defect_id") REFERENCES "defects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "iqc_reports" DROP CONSTRAINT IF EXISTS "iqc_reports_created_by_id_fkey";
ALTER TABLE "iqc_reports" ADD CONSTRAINT "iqc_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "iqc_reports" DROP CONSTRAINT IF EXISTS "iqc_reports_completed_by_id_fkey";
ALTER TABLE "iqc_reports" ADD CONSTRAINT "iqc_reports_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 17: Add new indexes
CREATE INDEX IF NOT EXISTS "iqc_reports_oem_id_supplier_id_idx" ON "iqc_reports"("oem_id", "supplier_id");
CREATE INDEX IF NOT EXISTS "iqc_reports_oem_id_result_idx" ON "iqc_reports"("oem_id", "result");
CREATE INDEX IF NOT EXISTS "iqc_reports_oem_id_created_at_idx" ON "iqc_reports"("oem_id", "created_at");

-- Step 18: Create iqc_checklist_items table (idempotent)
CREATE TABLE IF NOT EXISTS "iqc_checklist_items" (
    "id" TEXT NOT NULL,
    "iqc_inspection_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "requirement" TEXT,
    "result" "IqcChecklistResult" NOT NULL DEFAULT 'PENDING',
    "measured_value" TEXT,
    "comment" TEXT,
    "evidence_file_name" TEXT,
    "evidence_storage_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iqc_checklist_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "iqc_checklist_items" DROP CONSTRAINT IF EXISTS "iqc_checklist_items_iqc_inspection_id_fkey";
ALTER TABLE "iqc_checklist_items" ADD CONSTRAINT "iqc_checklist_items_iqc_inspection_id_fkey" FOREIGN KEY ("iqc_inspection_id") REFERENCES "iqc_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "iqc_checklist_items_iqc_inspection_id_result_idx" ON "iqc_checklist_items"("iqc_inspection_id", "result");

-- Step 19: Add new values to "DefectEventType" enum
DO $$ BEGIN
  ALTER TYPE "DefectEventType" ADD VALUE 'IQC_CHECKLIST_UPDATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DefectEventType" ADD VALUE 'IQC_CANCELLED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "DefectEventType" ADD VALUE 'IQC_RESULT_SET';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 20: Add new values to "NotificationType" enum
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'IQC_COMPLETED_FOR_SUPPLIER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'IQC_RESULT_SET';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;