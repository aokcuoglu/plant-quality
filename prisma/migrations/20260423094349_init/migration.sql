-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('OEM', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'QUALITY_ENGINEER', 'VIEWER');

-- CreateEnum
CREATE TYPE "DefectStatus" AS ENUM ('OPEN', 'WAITING_8D', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL,
    "taxNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defects" (
    "id" TEXT NOT NULL,
    "oemId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DefectStatus" NOT NULL DEFAULT 'OPEN',
    "imageUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eight_d_reports" (
    "id" TEXT NOT NULL,
    "defectId" TEXT NOT NULL,
    "d1_team" TEXT,
    "d2_problem" TEXT,
    "d3_containment" TEXT,
    "d4_rootCause" TEXT,
    "d5_d6_action" TEXT,
    "d7_preventive" TEXT,
    "d8_recognition" TEXT,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eight_d_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "eight_d_reports_defectId_key" ON "eight_d_reports"("defectId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_oemId_fkey" FOREIGN KEY ("oemId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defects" ADD CONSTRAINT "defects_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eight_d_reports" ADD CONSTRAINT "eight_d_reports_defectId_fkey" FOREIGN KEY ("defectId") REFERENCES "defects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
