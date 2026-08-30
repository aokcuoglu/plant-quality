-- CreateEnum
CREATE TYPE "UpgradeRequestStatus" AS ENUM ('OPEN', 'CONTACTED', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateTable
CREATE TABLE "upgrade_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "current_plan" TEXT NOT NULL,
    "requested_plan" TEXT NOT NULL,
    "source_feature" TEXT,
    "message" TEXT,
    "status" "UpgradeRequestStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upgrade_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upgrade_requests_company_id_status_idx" ON "upgrade_requests"("company_id", "status");

-- CreateIndex
CREATE INDEX "upgrade_requests_company_id_created_at_idx" ON "upgrade_requests"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "upgrade_requests_requested_by_id_idx" ON "upgrade_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "upgrade_requests_requested_plan_idx" ON "upgrade_requests"("requested_plan");

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;