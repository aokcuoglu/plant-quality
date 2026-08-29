import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.company.upsert({
    where: { id: "72d49d38-b5ca-4d5f-bff8-b524ebbfbf97" },
    update: {},
    create: {
      id: "72d49d38-b5ca-4d5f-bff8-b524ebbfbf97",
      name: "Anadolu Isuzu Otomotiv Sanayi ve Ticaret A.Ş.",
      type: "OEM",
      taxNumber: null,
      plan: "ENTERPRISE",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@anadoluisuzu.com" },
    update: {},
    create: {
      email: "admin@anadoluisuzu.com",
      name: "Anadolu Isuzu Admin",
      role: "ADMIN",
      plan: "ENTERPRISE",
      companyId: "72d49d38-b5ca-4d5f-bff8-b524ebbfbf97",
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "superadmin@isuzu.com" },
    update: {},
    create: {
      email: "superadmin@isuzu.com",
      name: "Super Admin",
      role: "SUPER_ADMIN",
      plan: "ENTERPRISE",
      companyId: null,
      emailVerified: new Date(),
    },
  });

  console.log("Seed complete: Anadolu Isuzu OEM + admin + super admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
