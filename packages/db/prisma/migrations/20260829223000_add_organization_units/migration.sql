-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('DIRECTORATE', 'MUDURLUK');

-- CreateTable
CREATE TABLE "organization_units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgUnitType" NOT NULL,
    "companyId" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_units_companyId_parentId_idx" ON "organization_units"("companyId", "parentId");

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "org_unit_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
