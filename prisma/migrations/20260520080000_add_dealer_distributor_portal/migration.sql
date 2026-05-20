-- AlterEnum: Add DEALER and DISTRIBUTOR to CompanyType
ALTER TYPE "CompanyType" ADD VALUE IF NOT EXISTS 'DEALER';
ALTER TYPE "CompanyType" ADD VALUE IF NOT EXISTS 'DISTRIBUTOR';

-- CreateEnum: ExternalOrderStatus
CREATE TYPE "ExternalOrderStatus" AS ENUM (
  'ORDER_RECEIVED',
  'PRODUCTION_PLANNED',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
  'ON_HOLD'
);

-- AlterTable: plant_logistic_orders — add dealer/distributor portal fields
ALTER TABLE "plant_logistic_orders" ADD COLUMN "external_visible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "plant_logistic_orders" ADD COLUMN "external_status" "ExternalOrderStatus";
ALTER TABLE "plant_logistic_orders" ADD COLUMN "external_status_note" TEXT;
ALTER TABLE "plant_logistic_orders" ADD COLUMN "dealer_company_id" TEXT;
ALTER TABLE "plant_logistic_orders" ADD COLUMN "distributor_company_id" TEXT;

-- CreateIndex: portal query optimization
CREATE INDEX "plant_logistic_orders_company_id_external_visible_idx" ON "plant_logistic_orders"("company_id", "external_visible");
CREATE INDEX "plant_logistic_orders_dealer_company_id_external_visible_idx" ON "plant_logistic_orders"("dealer_company_id", "external_visible");
CREATE INDEX "plant_logistic_orders_distributor_company_id_external_visible_idx" ON "plant_logistic_orders"("distributor_company_id", "external_visible");

-- AddForeignKey: dealer/distributor company relations
ALTER TABLE "plant_logistic_orders" ADD CONSTRAINT "plant_logistic_orders_dealer_company_id_fkey" FOREIGN KEY ("dealer_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_logistic_orders" ADD CONSTRAINT "plant_logistic_orders_distributor_company_id_fkey" FOREIGN KEY ("distributor_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;