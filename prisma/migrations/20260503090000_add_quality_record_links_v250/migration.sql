-- CreateEnum
CREATE TYPE "QualityRecordType" AS ENUM ('FIELD_DEFECT', 'DEFECT', 'EIGHT_D', 'PPAP', 'IQC', 'FMEA');

-- CreateEnum
CREATE TYPE "QualityLinkType" AS ENUM ('SAME_PART', 'SAME_SUPPLIER', 'SAME_FAILURE_MODE', 'SAME_VEHICLE', 'IQC_TO_DEFECT', 'FIELD_TO_8D', 'PPAP_REFERENCE', 'FMEA_COVERAGE', 'MANUAL', 'RELATED_HISTORY');

-- CreateTable
CREATE TABLE "quality_record_links" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "source_type" "QualityRecordType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_type" "QualityRecordType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "link_type" "QualityLinkType" NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_record_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quality_record_links_company_id_source_type_source_id_idx" ON "quality_record_links"("company_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "quality_record_links_company_id_target_type_target_id_idx" ON "quality_record_links"("company_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "quality_record_links_company_id_link_type_idx" ON "quality_record_links"("company_id", "link_type");

-- CreateIndex
CREATE INDEX "quality_record_links_company_id_created_at_idx" ON "quality_record_links"("company_id", "created_at");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "quality_record_links_source_type_source_id_target_type_target_id_link_type_key" ON "quality_record_links"("source_type", "source_id", "target_type", "target_id", "link_type");

-- AddForeignKey
ALTER TABLE "quality_record_links" ADD CONSTRAINT "quality_record_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_record_links" ADD CONSTRAINT "quality_record_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;