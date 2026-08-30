-- Reassign users holding the removed role values to EDITOR.
UPDATE "users" SET "role" = 'EDITOR'
WHERE "role" IN ('QUALITY_ENGINEER', 'SALES_EXPORT', 'PRODUCTION', 'PDI', 'DELIVERY');

-- Recreate the "Role" enum without the removed values.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER');

ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new"
USING ("role"::text::"Role_new");

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
