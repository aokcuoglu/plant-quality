-- Enum: "ProductionMilestoneGate"
CREATE TYPE "ProductionMilestoneGate" AS ENUM ('BODY', 'PAINT', 'ASSEMBLY', 'ELECTRICAL', 'POWERTRAIN', 'EOL_TEST', 'PDI', 'FINAL_QUALITY', 'YARD_READY', 'OTHER');

-- Enum: "ProductionMilestoneStatus"
CREATE TYPE "ProductionMilestoneStatus" AS ENUM ('NOT_STARTED', 'PLANNED', 'IN_PROGRESS', 'BLOCKED', 'QUALITY_HOLD', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- Alter enum: add new logistic order event types for milestones
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'MILESTONES_CREATED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'MILESTONE_STARTED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'MILESTONE_COMPLETED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'MILESTONE_BLOCKED';
ALTER TYPE "LogisticOrderEventType" ADD VALUE IF NOT EXISTS 'MILESTONE_QUALITY_HOLD';

-- Table: "plant_logistic_production_milestones"
CREATE TABLE "plant_logistic_production_milestones" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "gate" "ProductionMilestoneGate" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductionMilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "planned_start" TIMESTAMP(3),
    "planned_finish" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_finish" TIMESTAMP(3),
    "responsible_department" TEXT,
    "delay_reason" TEXT,
    "quality_hold" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_logistic_production_milestones_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "plant_logistic_production_milestones_company_id_order_id_idx" ON "plant_logistic_production_milestones"("company_id", "order_id");
CREATE INDEX "plant_logistic_production_milestones_company_id_status_idx" ON "plant_logistic_production_milestones"("company_id", "status");
CREATE INDEX "plant_logistic_production_milestones_company_id_gate_idx" ON "plant_logistic_production_milestones"("company_id", "gate");
CREATE INDEX "plant_logistic_production_milestones_company_id_planned_finish_idx" ON "plant_logistic_production_milestones"("company_id", "planned_finish");
CREATE INDEX "plant_logistic_production_milestones_order_id_sequence_idx" ON "plant_logistic_production_milestones"("order_id", "sequence");

-- Foreign keys
ALTER TABLE "plant_logistic_production_milestones" ADD CONSTRAINT "plant_logistic_production_milestones_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "plant_logistic_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plant_logistic_production_milestones" ADD CONSTRAINT "plant_logistic_production_milestones_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "plant_logistic_production_milestones" ADD CONSTRAINT "plant_logistic_production_milestones_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plant_logistic_production_milestones" ADD CONSTRAINT "plant_logistic_production_milestones_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;