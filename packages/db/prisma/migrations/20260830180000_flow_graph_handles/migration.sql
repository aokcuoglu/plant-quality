-- AlterTable
ALTER TABLE "logistic_flow_nodes" ADD COLUMN "input_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "logistic_flow_nodes" ADD COLUMN "output_count" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "logistic_flow_edges" ADD COLUMN "source_handle" TEXT NOT NULL DEFAULT 'out-0';
ALTER TABLE "logistic_flow_edges" ADD COLUMN "target_handle" TEXT NOT NULL DEFAULT 'in-0';

-- DropIndex
DROP INDEX IF EXISTS "logistic_flow_edges_flow_version_id_source_client_id_target_key";

-- CreateIndex
CREATE UNIQUE INDEX "logistic_flow_edges_flow_version_id_source_client_id_source_handle_target_client_id_target_handle_key" ON "logistic_flow_edges"("flow_version_id", "source_client_id", "source_handle", "target_client_id", "target_handle");

-- Seed sensible port counts for existing terminal nodes
UPDATE "logistic_flow_nodes" SET "input_count" = 0, "output_count" = 1 WHERE "kind" = 'START';
UPDATE "logistic_flow_nodes" SET "input_count" = 1, "output_count" = 0 WHERE "kind" = 'END';
