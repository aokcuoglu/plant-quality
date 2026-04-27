-- CreateEnum
CREATE TYPE "Ai8dReviewStatus" AS VALUES ('GENERATED', 'REVIEWED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ai_8d_reviews" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "eight_d_id" TEXT NOT NULL,
    "linked_field_defect_id" TEXT,
    "result_json" JSONB NOT NULL,
    "status" "Ai8dReviewStatus" NOT NULL DEFAULT 'GENERATED',
    "score" INTEGER,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejected_by_id" TEXT,
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "ai_8d_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_8d_reviews_company_id_eight_d_id_idx" ON "ai_8d_reviews"("company_id", "eight_d_id");

-- CreateIndex
CREATE INDEX "ai_8d_reviews_company_id_status_idx" ON "ai_8d_reviews"("company_id", "status");

-- CreateIndex
CREATE INDEX "ai_8d_reviews_company_id_created_at_idx" ON "ai_8d_reviews"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_8d_reviews_eight_d_id_status_idx" ON "ai_8d_reviews"("eight_d_id", "status");

-- AddForeignKey
ALTER TABLE "ai_8d_reviews" ADD CONSTRAINT "ai_8d_reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_8d_reviews" ADD CONSTRAINT "ai_8d_reviews_eight_d_id_fkey" FOREIGN KEY ("eight_d_id") REFERENCES "eight_d_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_8d_reviews" ADD CONSTRAINT "ai_8d_reviews_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_8d_reviews" ADD CONSTRAINT "ai_8d_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_8d_reviews" ADD CONSTRAINT "ai_8d_reviews_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum: add new DefectEventType values
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'AI_8D_REVIEW_GENERATED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'AI_8D_REVIEW_MARKED_REVIEWED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'AI_8D_REVIEW_REJECTED';
ALTER TYPE "DefectEventType" ADD VALUE IF NOT EXISTS 'AI_ROOT_CAUSE_SUGGESTED';