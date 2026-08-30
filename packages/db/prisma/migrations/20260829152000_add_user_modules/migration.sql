-- AlterTable
ALTER TABLE "users" ADD COLUMN "modules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
