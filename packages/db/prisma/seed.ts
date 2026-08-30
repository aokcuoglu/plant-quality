import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OEM_ID = "72d49d38-b5ca-4d5f-bff8-b524ebbfbf97";

const DIRECTORATES = [
  { id: "dir-ar-ge-elektrik-elektronik-sistemler", name: "Ar-Ge Elektrik Elektronik Sistemler Direktörlüğü" },
  { id: "dir-ar-ge-arac-gelistirme", name: "Ar-Ge Araç Geliştirme Direktörü" },
  { id: "dir-kalite-direkt-rl", name: "Kalite Direktörlüğü" },
  { id: "dir-teknik-direkt-rl-k", name: "Teknik Direktörlük" },
  { id: "dir-tedarik-zinciri-direkt-rl", name: "Tedarik Zinciri Direktörlüğü" },
  { id: "dir-i-hracat-direkt-rl", name: "İhracat Direktörlüğü" },
  { id: "dir-yurt-i-i-sat", name: "Yurtiçi Satış & Pazarlama ve Bayi Geliştirme Direktörlüğü" },
  { id: "dir-sat-sonras-hizmetler-direkt-rl", name: "Satış Sonrası Hizmetler Direktörlüğü" },
] as const;

async function main() {
  await prisma.company.upsert({
    where: { id: OEM_ID },
    update: {
      modules: ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"],
      ssoEnabled: true,
      microsoftTenantIds: ["a478e6bd-4c25-488f-a548-ea4418d55f64"],
      ssoAllowedDomains: ["isuzu.com.tr"],
    },
    create: {
      id: OEM_ID,
      name: "Anadolu Isuzu Otomotiv Sanayi ve Ticaret A.Ş.",
      type: "OEM",
      taxNumber: null,
      plan: "ENTERPRISE",
      modules: ["PLANT_QUALITY_MODULE", "PLANT_LOGISTIC_MODULE"],
      ssoEnabled: true,
      microsoftTenantIds: ["a478e6bd-4c25-488f-a548-ea4418d55f64"],
      ssoAllowedDomains: ["isuzu.com.tr"],
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
      companyId: OEM_ID,
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

  for (const dir of DIRECTORATES) {
    await prisma.organizationUnit.upsert({
      where: { id: dir.id },
      update: { name: dir.name },
      create: {
        id: dir.id,
        name: dir.name,
        type: "DIRECTORATE",
        companyId: OEM_ID,
      },
    });
  }

  console.log("Seed complete: Anadolu Isuzu OEM + admin + super admin + 8 direktorluk + org units");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
