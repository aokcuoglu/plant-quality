-- AlterTable: Add notification type enums for supplier development
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEV_PLAN_CREATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEV_PLAN_ACTION_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEV_PLAN_REVISION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEV_PLAN_COMPLETED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEV_PLAN_CANCELLED';

-- CreateEnum: Supplier Development enums
CREATE TYPE "DevPlanSourceType" AS ENUM ('SCORECARD', 'FIELD_DEFECT', 'DEFECT_8D', 'IQC', 'PPAP', 'FMEA', 'EXECUTIVE_COCKPIT', 'MANUAL');
CREATE TYPE "DevPlanPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "DevPlanStatus" AS ENUM ('DRAFT', 'OPEN', 'SUPPLIER_ACTION_REQUIRED', 'OEM_REVIEW', 'REVISION_REQUIRED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DevActionOwnerType" AS ENUM ('OEM', 'SUPPLIER');
CREATE TYPE "DevActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DevPlanEventType" AS ENUM ('PLAN_CREATED', 'PLAN_OPENED', 'PLAN_SENT_TO_SUPPLIER', 'PLAN_SUBMITTED_FOR_REVIEW', 'PLAN_REVISION_REQUESTED', 'PLAN_COMPLETED', 'PLAN_CANCELLED', 'ACTION_ITEM_ADDED', 'ACTION_ITEM_UPDATED', 'ACTION_ITEM_STATUS_CHANGED', 'ACTION_ITEM_RESPONSE_ADDED', 'COMMENT_ADDED');

-- CreateTable: SupplierDevelopmentPlan
CREATE TABLE "supplier_development_plans" (
    "id" TEXT NOT NULL,
    "oem_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source_type" "DevPlanSourceType",
    "source_id" TEXT,
    "priority" "DevPlanPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "DevPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "due_date" TIMESTAMP(3),
    "owner_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_development_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SupplierDevelopmentActionItem
CREATE TABLE "supplier_development_action_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_type" "DevActionOwnerType" NOT NULL DEFAULT 'OEM',
    "owner_id" TEXT,
    "status" "DevActionStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" TIMESTAMP(3),
    "supplier_response" TEXT,
    "oem_comment" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_development_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SupplierDevelopmentEvent
CREATE TABLE "supplier_development_events" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "type" "DevPlanEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_development_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SupplierDevelopmentPlan indexes
CREATE INDEX "supplier_development_plans_oem_id_supplier_id_idx" ON "supplier_development_plans"("oem_id", "supplier_id");
CREATE INDEX "supplier_development_plans_oem_id_status_idx" ON "supplier_development_plans"("oem_id", "status");
CREATE INDEX "supplier_development_plans_supplier_id_status_idx" ON "supplier_development_plans"("supplier_id", "status");
CREATE INDEX "supplier_development_plans_oem_id_priority_idx" ON "supplier_development_plans"("oem_id", "priority");
CREATE INDEX "supplier_development_plans_oem_id_due_date_idx" ON "supplier_development_plans"("oem_id", "due_date");

-- CreateIndex: SupplierDevelopmentActionItem indexes
CREATE INDEX "supplier_development_action_items_plan_id_status_idx" ON "supplier_development_action_items"("plan_id", "status");

-- CreateIndex: SupplierDevelopmentEvent indexes
CREATE INDEX "supplier_development_events_plan_id_created_at_idx" ON "supplier_development_events"("plan_id", "created_at");

-- AddForeignKey: SupplierDevelopmentPlan
ALTER TABLE "supplier_development_plans" ADD CONSTRAINT "supplier_development_plans_oem_id_fkey" FOREIGN KEY ("oem_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_development_plans" ADD CONSTRAINT "supplier_development_plans_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_development_plans" ADD CONSTRAINT "supplier_development_plans_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_development_plans" ADD CONSTRAINT "supplier_development_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_development_plans" ADD CONSTRAINT "supplier_development_plans_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: SupplierDevelopmentActionItem
ALTER TABLE "supplier_development_action_items" ADD CONSTRAINT "supplier_development_action_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "supplier_development_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_development_action_items" ADD CONSTRAINT "supplier_development_action_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: SupplierDevelopmentEvent
ALTER TABLE "supplier_development_events" ADD CONSTRAINT "supplier_development_events_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "supplier_development_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_development_events" ADD CONSTRAINT "supplier_development_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;