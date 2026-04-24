-- CreateEnum
CREATE TYPE "EightDSection" AS ENUM ('D3', 'D5', 'D6', 'D7');

-- AlterEnum
ALTER TYPE "DefectEventType" ADD VALUE 'EVIDENCE_ADDED';
ALTER TYPE "DefectEventType" ADD VALUE 'EVIDENCE_REMOVED';

-- CreateTable
CREATE TABLE "defect_evidence" (
    "id" TEXT NOT NULL,
    "defect_id" TEXT NOT NULL,
    "section" "EightDSection" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "defect_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defect_evidence_defect_id_section_idx" ON "defect_evidence"("defect_id", "section");

-- CreateIndex
CREATE INDEX "defect_evidence_company_id_created_at_idx" ON "defect_evidence"("company_id", "created_at");

-- AddForeignKey
ALTER TABLE "defect_evidence" ADD CONSTRAINT "defect_evidence_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_evidence" ADD CONSTRAINT "defect_evidence_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_evidence" ADD CONSTRAINT "defect_evidence_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
