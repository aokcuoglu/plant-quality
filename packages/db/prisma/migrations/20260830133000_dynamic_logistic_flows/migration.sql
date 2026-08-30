-- CreateEnum
CREATE TYPE "LogisticProcessType" AS ENUM ('OPERATION', 'QUALITY_CONTROL', 'WAITING', 'STORAGE_YARD', 'DISPATCH', 'TRANSPORT', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "LogisticFlowVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LogisticFlowNodeKind" AS ENUM ('START', 'PROCESS', 'END');

-- CreateEnum
CREATE TYPE "LogisticVehicleFlowStatus" AS ENUM ('WAITING_FOR_FLOW', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogisticTransitionType" AS ENUM ('START', 'ADVANCE', 'ADMIN_OVERRIDE', 'COMPLETE');

-- CreateTable
CREATE TABLE "logistic_vehicle_groups" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistic_vehicle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_vehicle_models" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistic_vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_processes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LogisticProcessType" NOT NULL,
    "description" TEXT,
    "organization_unit_id" TEXT,
    "target_duration_minutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistic_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_flow_versions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LogisticFlowVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistic_flow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_flow_nodes" (
    "id" TEXT NOT NULL,
    "flow_version_id" TEXT NOT NULL,
    "process_id" TEXT,
    "client_id" TEXT NOT NULL,
    "kind" "LogisticFlowNodeKind" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "name_snapshot" TEXT NOT NULL,
    "type_snapshot" "LogisticProcessType",
    "description_snapshot" TEXT,
    "organization_unit_id_snapshot" TEXT,
    "target_duration_minutes_snapshot" INTEGER,

    CONSTRAINT "logistic_flow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_flow_edges" (
    "id" TEXT NOT NULL,
    "flow_version_id" TEXT NOT NULL,
    "source_client_id" TEXT NOT NULL,
    "target_client_id" TEXT NOT NULL,

    CONSTRAINT "logistic_flow_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_order_lines" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "vehicle_model_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "variant" TEXT,
    "powertrain" "LogisticOrderPowertrain",
    "priority" "LogisticOrderPriority" NOT NULL DEFAULT 'NORMAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistic_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_vehicle_units" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "order_line_id" TEXT NOT NULL,
    "vehicle_model_id" TEXT NOT NULL,
    "temporary_unit_code" TEXT NOT NULL,
    "vin" TEXT,
    "chassis_number" TEXT,
    "flow_version_id" TEXT,
    "current_node_id" TEXT,
    "flow_status" "LogisticVehicleFlowStatus" NOT NULL DEFAULT 'WAITING_FOR_FLOW',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistic_vehicle_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistic_vehicle_process_visits" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "vehicle_unit_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exited_at" TIMESTAMP(3),
    "actor_id" TEXT,
    "transition_type" "LogisticTransitionType" NOT NULL,
    "override_reason" TEXT,

    CONSTRAINT "logistic_vehicle_process_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logistic_vehicle_groups_company_id_active_idx" ON "logistic_vehicle_groups"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_vehicle_groups_company_id_code_key" ON "logistic_vehicle_groups"("company_id", "code");

-- CreateIndex
CREATE INDEX "logistic_vehicle_models_company_id_group_id_active_idx" ON "logistic_vehicle_models"("company_id", "group_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_vehicle_models_company_id_code_key" ON "logistic_vehicle_models"("company_id", "code");

-- CreateIndex
CREATE INDEX "logistic_processes_company_id_active_idx" ON "logistic_processes"("company_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_processes_company_id_name_key" ON "logistic_processes"("company_id", "name");

-- CreateIndex
CREATE INDEX "logistic_flow_versions_company_id_group_id_status_idx" ON "logistic_flow_versions"("company_id", "group_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_flow_versions_group_id_version_key" ON "logistic_flow_versions"("group_id", "version");

-- One mutable draft and one active published version per vehicle group.
CREATE UNIQUE INDEX "logistic_flow_versions_one_draft_per_group" ON "logistic_flow_versions"("group_id") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "logistic_flow_versions_one_published_per_group" ON "logistic_flow_versions"("group_id") WHERE "status" = 'PUBLISHED';

-- CreateIndex
CREATE UNIQUE INDEX "logistic_flow_nodes_flow_version_id_client_id_key" ON "logistic_flow_nodes"("flow_version_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_flow_nodes_flow_version_id_sequence_key" ON "logistic_flow_nodes"("flow_version_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_flow_edges_flow_version_id_source_client_id_target_key" ON "logistic_flow_edges"("flow_version_id", "source_client_id", "target_client_id");

-- CreateIndex
CREATE INDEX "logistic_order_lines_company_id_vehicle_model_id_idx" ON "logistic_order_lines"("company_id", "vehicle_model_id");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_order_lines_order_id_sequence_key" ON "logistic_order_lines"("order_id", "sequence");

-- CreateIndex
CREATE INDEX "logistic_vehicle_units_company_id_flow_version_id_current_n_idx" ON "logistic_vehicle_units"("company_id", "flow_version_id", "current_node_id");

-- CreateIndex
CREATE INDEX "logistic_vehicle_units_company_id_flow_status_idx" ON "logistic_vehicle_units"("company_id", "flow_status");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_vehicle_units_company_id_temporary_unit_code_key" ON "logistic_vehicle_units"("company_id", "temporary_unit_code");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_vehicle_units_company_id_vin_key" ON "logistic_vehicle_units"("company_id", "vin");

-- CreateIndex
CREATE UNIQUE INDEX "logistic_vehicle_units_company_id_chassis_number_key" ON "logistic_vehicle_units"("company_id", "chassis_number");

-- CreateIndex
CREATE INDEX "logistic_vehicle_process_visits_company_id_vehicle_unit_id__idx" ON "logistic_vehicle_process_visits"("company_id", "vehicle_unit_id", "entered_at");

-- AddForeignKey
ALTER TABLE "logistic_vehicle_groups" ADD CONSTRAINT "logistic_vehicle_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_models" ADD CONSTRAINT "logistic_vehicle_models_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_models" ADD CONSTRAINT "logistic_vehicle_models_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "logistic_vehicle_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_processes" ADD CONSTRAINT "logistic_processes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_flow_versions" ADD CONSTRAINT "logistic_flow_versions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_flow_versions" ADD CONSTRAINT "logistic_flow_versions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "logistic_vehicle_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_flow_nodes" ADD CONSTRAINT "logistic_flow_nodes_flow_version_id_fkey" FOREIGN KEY ("flow_version_id") REFERENCES "logistic_flow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_flow_nodes" ADD CONSTRAINT "logistic_flow_nodes_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "logistic_processes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_flow_edges" ADD CONSTRAINT "logistic_flow_edges_flow_version_id_fkey" FOREIGN KEY ("flow_version_id") REFERENCES "logistic_flow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_order_lines" ADD CONSTRAINT "logistic_order_lines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_order_lines" ADD CONSTRAINT "logistic_order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "plant_logistic_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_order_lines" ADD CONSTRAINT "logistic_order_lines_vehicle_model_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "logistic_vehicle_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_units" ADD CONSTRAINT "logistic_vehicle_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_units" ADD CONSTRAINT "logistic_vehicle_units_order_line_id_fkey" FOREIGN KEY ("order_line_id") REFERENCES "logistic_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_units" ADD CONSTRAINT "logistic_vehicle_units_vehicle_model_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "logistic_vehicle_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_units" ADD CONSTRAINT "logistic_vehicle_units_flow_version_id_fkey" FOREIGN KEY ("flow_version_id") REFERENCES "logistic_flow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_units" ADD CONSTRAINT "logistic_vehicle_units_current_node_id_fkey" FOREIGN KEY ("current_node_id") REFERENCES "logistic_flow_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_process_visits" ADD CONSTRAINT "logistic_vehicle_process_visits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_process_visits" ADD CONSTRAINT "logistic_vehicle_process_visits_vehicle_unit_id_fkey" FOREIGN KEY ("vehicle_unit_id") REFERENCES "logistic_vehicle_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistic_vehicle_process_visits" ADD CONSTRAINT "logistic_vehicle_process_visits_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "logistic_flow_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
