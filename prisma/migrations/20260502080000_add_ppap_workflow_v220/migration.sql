-- CreateEnum
CREATE TYPE "PpapReasonForSubmission" AS ENUM ('NEW_PART', 'ENGINEERING_CHANGE', 'SUPPLIER_CHANGE', 'PROCESS_CHANGE', 'TOOLING_CHANGE', 'ANNUAL_REVALIDATION', 'CORRECTIVE_ACTION_FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "PpapDocumentStatus" AS ENUM ('MISSING', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED');

-- AlterEnum: PpapStatus - add new values
ALTER TYPE "PpapStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';
ALTER TYPE "PpapStatus" ADD VALUE IF NOT EXISTS 'SUPPLIER_IN_PROGRESS';
ALTER TYPE "PpapStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUIRED';
ALTER TYPE "PpapStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PpapStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

-- AlterEnum: PpapLevel - add LEVEL_5
ALTER TYPE "PpapLevel" ADD VALUE IF NOT EXISTS 'LEVEL_5';

-- AlterEnum: PpapSubmissionRequirement - add CUSTOMER_SPECIFIC_REQUIREMENTS
ALTER TYPE "PpapSubmissionRequirement" ADD VALUE IF NOT EXISTS 'CUSTOMER_SPECIFIC_REQUIREMENTS';

-- AlterEnum: DefectEventType - add new PPAP event types
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'PPAP_REVISION_REQUESTED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'PPAP_CANCELLED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'PPAP_DOCUMENT_UPLOADED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'PPAP_DOCUMENT_APPROVED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'PPAP_DOCUMENT_REJECTED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'PPAP_DOCUMENT_REVISION_REQUESTED';

-- AlterTable: PpapSubmission - add new columns
ALTER TABLE "ppap_submissions" ADD COLUMN "request_number" TEXT;
ALTER TABLE "ppap_submissions" ADD COLUMN "project_name" TEXT;
ALTER TABLE "ppap_submissions" ADD COLUMN "vehicle_model" TEXT;
ALTER TABLE "ppap_submissions" ADD COLUMN "revision_level" TEXT;
ALTER TABLE "ppap_submissions" ADD COLUMN "drawing_number" TEXT;
ALTER TABLE "ppap_submissions" ADD COLUMN "reason_for_submission" "PpapReasonForSubmission" NOT NULL DEFAULT 'NEW_PART';
ALTER TABLE "ppap_submissions" ADD COLUMN "reviewed_by_id" TEXT;

-- Populate request_number for existing rows with a sequential prefix
UPDATE "ppap_submissions" SET "request_number" = 'PPAP-' || "id" WHERE "request_number" IS NULL;

-- Make request_number unique and NOT NULL
ALTER TABLE "ppap_submissions" ALTER COLUMN "request_number" SET NOT NULL;
CREATE UNIQUE INDEX "ppap_submissions_request_number_key" ON "ppap_submissions"("request_number");

-- AddForeignKey for reviewedById
ALTER TABLE "ppap_submissions" ADD CONSTRAINT "ppap_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- AlterTable: PpapEvidence - add new columns and modify existing
ALTER TABLE "ppap_evidence" ADD COLUMN "status" "PpapDocumentStatus" NOT NULL DEFAULT 'MISSING';
ALTER TABLE "ppap_evidence" ADD COLUMN "supplier_comment" TEXT;
ALTER TABLE "ppap_evidence" ADD COLUMN "oem_comment" TEXT;
ALTER TABLE "ppap_evidence" ADD COLUMN "reviewed_by_id" TEXT;
ALTER TABLE "ppap_evidence" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "ppap_evidence" ALTER COLUMN "storage_key" DROP NOT NULL;
ALTER TABLE "ppap_evidence" ALTER COLUMN "file_name" DROP NOT NULL;
ALTER TABLE "ppap_evidence" ALTER COLUMN "mime_type" DROP NOT NULL;
ALTER TABLE "ppap_evidence" ALTER COLUMN "size_bytes" DROP NOT NULL;
ALTER TABLE "ppap_evidence" ALTER COLUMN "uploaded_by_id" DROP NOT NULL;
ALTER TABLE "ppap_evidence" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing evidence rows: set status to UPLOADED where storage_key is not null
UPDATE "ppap_evidence" SET "status" = 'UPLOADED' WHERE "storage_key" IS NOT NULL AND "deleted_at" IS NULL;

-- AddForeignKey for evidence reviewedById
ALTER TABLE "ppap_evidence" ADD CONSTRAINT "ppap_evidence_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "ppap_evidence_ppap_id_status_idx" ON "ppap_evidence"("ppap_id", "status");

-- Remove old enum value REVISED (no longer used) - cannot easily remove enum value in PostgreSQL
-- We keep REVISED in the enum for backward compatibility but new code will not use it.