-- AlterEnum: Add DispatchTransportMode values
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'YARD_STATUS_UPDATED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'YARD_READY_FOR_DISPATCH';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'YARD_BLOCKED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'YARD_UNBLOCKED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_CREATED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_STATUS_CHANGED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_CARRIER_ASSIGNED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_LOADING_PLANNED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_LOADED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_IN_TRANSIT';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_ARRIVED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_DELIVERED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'DISPATCH_CANCELLED';

-- CreateEnum: DispatchTransportMode
CREATE TYPE "DispatchTransportMode" AS ENUM ('ROAD', 'SEA', 'RAIL', 'AIR', 'MULTIMODAL', 'OTHER');

-- CreateEnum: DispatchStatus
CREATE TYPE "DispatchStatus" AS ENUM ('NOT_PLANNED', 'PLANNED', 'CARRIER_ASSIGNED', 'LOADING_PLANNED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED');

-- CreateTable: PlantLogisticYardStatus
CREATE TABLE "plant_logistic_yard_statuses" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "yard_location" TEXT,
    "parking_slot" TEXT,
    "ready_for_dispatch" BOOLEAN NOT NULL DEFAULT false,
    "blocked_for_dispatch" BOOLEAN NOT NULL DEFAULT false,
    "block_reason" TEXT,
    "last_movement_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_logistic_yard_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlantLogisticDispatch
CREATE TABLE "plant_logistic_dispatches" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "dispatch_batch_no" TEXT,
    "carrier_name" TEXT,
    "transport_mode" "DispatchTransportMode" NOT NULL DEFAULT 'ROAD',
    "status" "DispatchStatus" NOT NULL DEFAULT 'NOT_PLANNED',
    "planned_loading_date" TIMESTAMP(3),
    "actual_loading_date" TIMESTAMP(3),
    "estimated_arrival_date" TIMESTAMP(3),
    "actual_arrival_date" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "destination_country" TEXT,
    "destination_city" TEXT,
    "dealer_or_distributor_name" TEXT,
    "tracking_reference" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_logistic_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PlantLogisticYardStatus indexes
CREATE UNIQUE INDEX "plant_logistic_yard_statuses_order_id_key" ON "plant_logistic_yard_statuses"("order_id");
CREATE INDEX "plant_logistic_yard_statuses_company_id_order_id_idx" ON "plant_logistic_yard_statuses"("company_id", "order_id");
CREATE INDEX "plant_logistic_yard_statuses_company_id_ready_for_dispatch_idx" ON "plant_logistic_yard_statuses"("company_id", "ready_for_dispatch");
CREATE INDEX "plant_logistic_yard_statuses_company_id_blocked_for_dispatch_idx" ON "plant_logistic_yard_statuses"("company_id", "blocked_for_dispatch");

-- CreateIndex: PlantLogisticDispatch indexes
CREATE INDEX "plant_logistic_dispatches_company_id_order_id_idx" ON "plant_logistic_dispatches"("company_id", "order_id");
CREATE INDEX "plant_logistic_dispatches_company_id_status_idx" ON "plant_logistic_dispatches"("company_id", "status");
CREATE INDEX "plant_logistic_dispatches_company_id_planned_loading_date_idx" ON "plant_logistic_dispatches"("company_id", "planned_loading_date");
CREATE INDEX "plant_logistic_dispatches_company_id_estimated_arrival_date_idx" ON "plant_logistic_dispatches"("company_id", "estimated_arrival_date");

-- AddForeignKey: PlantLogisticYardStatus -> PlantLogisticOrder
ALTER TABLE "plant_logistic_yard_statuses" ADD CONSTRAINT "plant_logistic_yard_statuses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "plant_logistic_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticYardStatus -> Company
ALTER TABLE "plant_logistic_yard_statuses" ADD CONSTRAINT "plant_logistic_yard_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticYardStatus -> User (createdBy)
ALTER TABLE "plant_logistic_yard_statuses" ADD CONSTRAINT "plant_logistic_yard_statuses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticYardStatus -> User (updatedBy)
ALTER TABLE "plant_logistic_yard_statuses" ADD CONSTRAINT "plant_logistic_yard_statuses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticDispatch -> PlantLogisticOrder
ALTER TABLE "plant_logistic_dispatches" ADD CONSTRAINT "plant_logistic_dispatches_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "plant_logistic_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticDispatch -> Company
ALTER TABLE "plant_logistic_dispatches" ADD CONSTRAINT "plant_logistic_dispatches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticDispatch -> User (createdBy)
ALTER TABLE "plant_logistic_dispatches" ADD CONSTRAINT "plant_logistic_dispatches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: PlantLogisticDispatch -> User (updatedBy)
ALTER TABLE "plant_logistic_dispatches" ADD CONSTRAINT "plant_logistic_dispatches_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;