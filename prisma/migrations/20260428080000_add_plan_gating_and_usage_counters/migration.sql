-- Add FREE and ENTERPRISE to Plan enum
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'FREE';
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'ENTERPRISE';

-- Add plan fields to companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "plan_status" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "plan_started_at" TIMESTAMP(3);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMP(3);

-- Update existing OEM companies to PRO plan (preserve existing behavior)
UPDATE "companies" SET "plan" = 'PRO' WHERE "type" = 'OEM' AND "plan" = 'FREE';

-- Create usage_counters table
-- Note: companies.id is TEXT (Prisma String), not UUID
CREATE TABLE IF NOT EXISTS "usage_counters" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "usage_key" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_company_id_usage_key_period_start_pe_key"
    UNIQUE ("company_id", "usage_key", "period_start", "period_end");

-- Add indexes
CREATE INDEX IF NOT EXISTS "usage_counters_company_id_usage_key_period_start_idx"
    ON "usage_counters"("company_id", "usage_key", "period_start");