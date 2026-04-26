-- AlterTable: Add category intelligence fields to field_defects
ALTER TABLE "field_defects" ADD COLUMN "category" TEXT;
ALTER TABLE "field_defects" ADD COLUMN "subcategory" TEXT;
ALTER TABLE "field_defects" ADD COLUMN "probable_area" TEXT;
ALTER TABLE "field_defects" ADD COLUMN "ai_category_applied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "field_defects" ADD COLUMN "ai_category_applied_at" TIMESTAMP(3);
ALTER TABLE "field_defects" ADD COLUMN "ai_category_applied_by_id" TEXT;

-- CreateIndex: Category intelligence and analytics indexes
CREATE INDEX "field_defects_oemId_category_idx" ON "field_defects"("oem_id", "category");
CREATE INDEX "field_defects_oemId_subcategory_idx" ON "field_defects"("oem_id", "subcategory");
CREATE INDEX "field_defects_oemId_probable_area_idx" ON "field_defects"("oem_id", "probable_area");
CREATE INDEX "field_defects_oemId_created_at_idx" ON "field_defects"("oem_id", "created_at");
CREATE INDEX "field_defects_oemId_supplier_id_idx" ON "field_defects"("oem_id", "supplier_id");
CREATE INDEX "field_defects_oemId_vehicle_model_idx" ON "field_defects"("oem_id", "vehicle_model");
CREATE INDEX "field_defects_oemId_part_number_idx" ON "field_defects"("oem_id", "part_number");

-- AddForeignKey: AI category applied by user
ALTER TABLE "field_defects" ADD CONSTRAINT "field_defects_ai_category_applied_by_id_fkey" FOREIGN KEY ("ai_category_applied_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;