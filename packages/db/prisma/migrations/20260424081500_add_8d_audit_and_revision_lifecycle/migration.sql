-- CreateEnum
CREATE TYPE "ReviewCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DefectEventType" AS ENUM (
  'CREATED',
  'EIGHT_D_STARTED',
  'EIGHT_D_STEP_SAVED',
  'EIGHT_D_SUBMITTED',
  'REVIEW_COMMENT_ADDED',
  'REVIEW_COMMENT_RESPONDED',
  'REVIEW_COMMENT_RESOLVED',
  'REVIEW_COMMENT_REOPENED',
  'REVISION_REQUESTED',
  'APPROVED'
);

-- AlterTable
ALTER TABLE "eight_d_reports"
ADD COLUMN "last_submitted_at" TIMESTAMP(3),
ADD COLUMN "last_reviewed_at" TIMESTAMP(3),
ADD COLUMN "approved_at" TIMESTAMP(3),
ADD COLUMN "approved_by_id" TEXT,
ADD COLUMN "rejected_at" TIMESTAMP(3),
ADD COLUMN "rejected_by_id" TEXT,
ADD COLUMN "revision_no" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "review_comments"
ADD COLUMN "status" "ReviewCommentStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "supplier_response" TEXT,
ADD COLUMN "resolved_at" TIMESTAMP(3),
ADD COLUMN "resolved_by_id" TEXT;

-- CreateTable
CREATE TABLE "defect_events" (
  "id" TEXT NOT NULL,
  "defect_id" TEXT NOT NULL,
  "type" "DefectEventType" NOT NULL,
  "actor_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "defect_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "defect_events_defect_id_created_at_idx" ON "defect_events"("defect_id", "created_at");

-- AddForeignKey
ALTER TABLE "eight_d_reports" ADD CONSTRAINT "eight_d_reports_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eight_d_reports" ADD CONSTRAINT "eight_d_reports_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_events" ADD CONSTRAINT "defect_events_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_events" ADD CONSTRAINT "defect_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
