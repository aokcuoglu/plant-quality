/*
  Warnings:

  - The `d1_team` column on the `eight_d_reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `d3_containment` column on the `eight_d_reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "eight_d_reports" ADD COLUMN     "d5_actions" JSONB,
ADD COLUMN     "d6_actions" JSONB,
ADD COLUMN     "d7_impacts" JSONB,
DROP COLUMN "d1_team",
ADD COLUMN     "d1_team" JSONB,
DROP COLUMN "d3_containment",
ADD COLUMN     "d3_containment" JSONB;

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_module_key" ON "waitlist"("email", "module");
