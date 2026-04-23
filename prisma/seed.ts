import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const oemCompany = await prisma.company.upsert({
    where: { id: "oem-company" },
    update: {},
    create: {
      id: "oem-company",
      name: "PlantX Automotive",
      type: "OEM",
      taxNumber: "1234567890",
    },
  });

  const supplierCompany = await prisma.company.upsert({
    where: { id: "supplier-company" },
    update: {},
    create: {
      id: "supplier-company",
      name: "Precision Parts Inc.",
      type: "SUPPLIER",
      taxNumber: "9876543210",
    },
  });

  const supplierCompany2 = await prisma.company.upsert({
    where: { id: "supplier-company-2" },
    update: {},
    create: {
      id: "supplier-company-2",
      name: "SteelForged Co.",
      type: "SUPPLIER",
      taxNumber: "5556667777",
    },
  });

  const users = [
    {
      id: "oem-admin",
      email: "admin@oem.com",
      name: "OEM Admin",
      role: "ADMIN" as const,
      companyId: oemCompany.id,
    },
    {
      id: "oem-quality",
      email: "quality@oem.com",
      name: "OEM Quality Engineer",
      role: "QUALITY_ENGINEER" as const,
      companyId: oemCompany.id,
    },
    {
      id: "supplier-admin",
      email: "admin@supplier.com",
      name: "Supplier Admin",
      role: "ADMIN" as const,
      companyId: supplierCompany.id,
    },
    {
      id: "supplier-engineer",
      email: "engineer@supplier.com",
      name: "Supplier Engineer",
      role: "QUALITY_ENGINEER" as const,
      companyId: supplierCompany.id,
    },
    {
      id: "steelforged-admin",
      email: "admin@steelforged.com",
      name: "SteelForged Admin",
      role: "ADMIN" as const,
      companyId: supplierCompany2.id,
    },
    {
      id: "steelforged-engineer",
      email: "engineer@steelforged.com",
      name: "SteelForged Engineer",
      role: "QUALITY_ENGINEER" as const,
      companyId: supplierCompany2.id,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  const defects = [
    {
      id: "defect-001",
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "AX-7420-B",
      description: "Surface porosity exceeding acceptable limits on cylinder head casting. Multiple pits observed on sealing surface.",
      status: "OPEN" as const,
    },
    {
      id: "defect-002",
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "BR-1122-C",
      description: "Thread gauge failure on M12 bolts. Pitch diameter out of tolerance by 0.15mm.",
      status: "IN_PROGRESS" as const,
    },
    {
      id: "defect-003",
      oemId: oemCompany.id,
      supplierId: supplierCompany2.id,
      partNumber: "CS-3344-D",
      description: "Crack detected during ultrasonic testing on steering knuckle forging. Linear indication 8mm length in radius area.",
      status: "OPEN" as const,
    },
    {
      id: "defect-004",
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "AX-7420-B",
      description: "Hardness below specification after heat treatment. Measured 38 HRC vs required 42-46 HRC.",
      status: "RESOLVED" as const,
      resolvedAt: new Date("2025-03-20"),
    },
  ];

  for (const defect of defects) {
    await prisma.defect.upsert({
      where: { id: defect.id },
      update: {},
      create: defect,
    });
  }

  console.log("Seed completed successfully!");
  console.log("Test accounts:");
  console.log("  admin@oem.com (OEM Admin)");
  console.log("  quality@oem.com (OEM Quality Engineer)");
  console.log("  admin@supplier.com (Supplier Admin)");
  console.log("  engineer@supplier.com (Supplier Engineer)");
  console.log("  admin@steelforged.com (SteelForged Admin)");
  console.log("  engineer@steelforged.com (SteelForged Engineer)");
  console.log(`\nSeeded ${defects.length} sample defects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
