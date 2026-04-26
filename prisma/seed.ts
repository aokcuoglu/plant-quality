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
      create: { ...user, emailVerified: new Date() },
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

  const ppapSubmissions = [
    {
      id: "ppap-001",
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      revision: "A",
      level: "LEVEL_3" as const,
      status: "SUBMITTED" as const,
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      oemOwnerId: "oem-quality",
      supplierAssigneeId: "supplier-engineer",
      defectId: "defect-001",
      dueDate: new Date("2026-05-30"),
      requirements: {
        DESIGN_RECORDS: true,
        PROCESS_FLOW_DIAGRAM: true,
        PROCESS_FMEA: true,
        CONTROL_PLAN: true,
        MEASUREMENT_SYSTEM_ANALYSIS: true,
        DIMENSIONAL_RESULTS: true,
        MATERIAL_PERFORMANCE_RESULTS: true,
        PART_SUBMISSION_WARRANT: true,
      },
    },
    {
      id: "ppap-002",
      partNumber: "BR-1122-C",
      partName: "M12 Hex Bolt",
      revision: "B",
      level: "LEVEL_2" as const,
      status: "DRAFT" as const,
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      oemOwnerId: "oem-admin",
      defectId: "defect-002",
    },
    {
      id: "ppap-003",
      partNumber: "CS-3344-D",
      partName: "Steering Knuckle Forging",
      revision: "A",
      level: "LEVEL_3" as const,
      status: "APPROVED" as const,
      oemId: oemCompany.id,
      supplierId: supplierCompany2.id,
      defectId: "defect-003",
      approvedById: "oem-quality",
      approvedAt: new Date("2026-01-15"),
    },
  ]

  for (const ppap of ppapSubmissions) {
    await prisma.ppapSubmission.upsert({
      where: { id: ppap.id },
      update: {},
      create: ppap,
    })
  }

  const iqcReports = [
    {
      id: "iqc-001",
      lotNumber: "LOT-2026-0042",
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      quantity: 50,
      quantityAccepted: 45,
      quantityRejected: 5,
      status: "FAILED" as const,
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      inspectorId: "oem-quality",
      defectId: "defect-001",
      inspectionDate: new Date("2026-04-10"),
      measurements: [
        { characteristic: "Surface Porosity", specification: "< 3 pits/cm²", measured: "8 pits/cm²", result: "FAIL" },
        { characteristic: "Surface Roughness (Ra)", specification: "1.6 μm max", measured: "1.2 μm", result: "PASS" },
      ],
      nonconformities: [
        { description: "Excessive surface porosity on sealing surface", severity: "Major" },
      ],
      dispositionNotes: "Reject entire lot. Surface porosity exceeds acceptable limits on 5 units.",
      completedAt: new Date("2026-04-12"),
    },
    {
      id: "iqc-002",
      lotNumber: "LOT-2026-0055",
      partNumber: "BR-1122-C",
      partName: "M12 Hex Bolt",
      quantity: 200,
      quantityAccepted: 200,
      quantityRejected: 0,
      status: "PASSED" as const,
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      inspectorId: "oem-quality",
      inspectionDate: new Date("2026-04-18"),
      measurements: [
        { characteristic: "Pitch Diameter", specification: "10.013-10.028mm", measured: "10.020mm", result: "PASS" },
        { characteristic: "Hardness (HRC)", specification: "32-38 HRC", measured: "35 HRC", result: "PASS" },
      ],
      completedAt: new Date("2026-04-19"),
    },
  ]

  for (const iqc of iqcReports) {
    await prisma.iqcReport.upsert({
      where: { id: iqc.id },
      update: {},
      create: iqc,
    })
  }

  const fmeas = [
    {
      id: "fmea-001",
      title: "Cylinder Head Casting Process FMEA",
      fmeaType: "PROCESS" as const,
      status: "DRAFT" as const,
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      processStep: "Casting - Gravity Die Casting",
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      responsibleId: "supplier-engineer",
      defectId: "defect-001",
      rows: [
        {
          id: "row_1",
          processStep: "Mold preparation",
          potentialFailureMode: "Mold surface contamination",
          potentialEffect: "Surface porosity defect on casting",
          severity: 8,
          potentialCause: "Inadequate mold cleaning procedure",
          occurrence: 5,
          currentControl: "Visual inspection after mold preparation",
          detection: 4,
          rpn: 160,
          recommendedAction: "Implement ultrasonic mold surface cleaning",
          targetDate: "2026-05-15",
        },
        {
          id: "row_2",
          processStep: "Pouring",
          potentialFailureMode: "Insufficient pouring temperature",
          potentialEffect: "Cold shuts and incomplete filling",
          severity: 7,
          potentialCause: "Temperature measurement error",
          occurrence: 3,
          currentControl: "Thermocouple monitoring",
          detection: 3,
          rpn: 63,
          recommendedAction: "Add redundant temperature sensor",
        },
      ],
    },
    {
      id: "fmea-002",
      title: "Steering Knuckle Design FMEA",
      fmeaType: "DESIGN" as const,
      status: "APPROVED" as const,
      partNumber: "CS-3344-D",
      partName: "Steering Knuckle Forging",
      oemId: oemCompany.id,
      supplierId: supplierCompany2.id,
      responsibleId: "steelforged-engineer",
      approvedById: "oem-quality",
      approvedAt: new Date("2026-01-20"),
      rows: [
        {
          id: "row_1",
          potentialFailureMode: "Fatigue crack at radius",
          potentialEffect: "Steering failure — safety critical",
          severity: 10,
          potentialCause: "Stress concentration at fillet radius",
          occurrence: 2,
          currentControl: "Ultrasonic testing per lot",
          detection: 2,
          rpn: 40,
          recommendedAction: "Increase fillet radius from R3 to R5",
          actionTaken: "Fillet radius increased to R5 in Rev B",
          revisedSeverity: 10,
          revisedOccurrence: 1,
          revisedDetection: 2,
          revisedRpn: 20,
        },
      ],
    },
  ]

  for (const fmea of fmeas) {
    await prisma.fmea.upsert({
      where: { id: fmea.id },
      update: {},
      create: fmea,
    })
  }

  // Field Defects seed
  const fieldDefects = [
    {
      id: "fd-001",
      title: "Brake pedal vibration at highway speed",
      description: "Customer reports significant brake pedal vibration when braking at speeds above 100 km/h. Vibration felt through steering column. Suspected warped brake disc from supplier.",
      source: "FIELD" as const,
      status: "OPEN" as const,
      severity: "MAJOR" as const,
      safetyImpact: true,
      vehicleDown: false,
      repeatIssue: true,
      vin: "WVWZZZ3CZWE123456",
      vehicleModel: "Model S 2025",
      vehicleVariant: "Long Range",
      mileage: 15200,
      failureDate: new Date("2026-04-10"),
      reportDate: new Date("2026-04-12"),
      location: "Istanbul Service Center",
      partNumber: "BR-5501-A",
      partName: "Front Brake Disc Assembly",
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      supplierNameSnapshot: "Precision Parts Inc.",
      createdById: "oem-quality",
    },
    {
      id: "fd-002",
      title: "Intermittent power steering failure",
      description: "Multiple field reports of power steering warning light illuminating during low-speed maneuvers. Steering becomes heavy for 2-3 seconds before recovering. Safety-critical issue requiring immediate investigation.",
      source: "CUSTOMER" as const,
      status: "SUPPLIER_ASSIGNED" as const,
      severity: "CRITICAL" as const,
      safetyImpact: true,
      vehicleDown: true,
      repeatIssue: true,
      vin: "WVWZZZ3CZWE789012",
      vehicleModel: "Model X 2025",
      mileage: 8700,
      failureDate: new Date("2026-04-18"),
      reportDate: new Date("2026-04-19"),
      location: "Ankara Auto Gallery",
      partNumber: "PS-2233-B",
      partName: "Electronic Power Steering Module",
      oemId: oemCompany.id,
      supplierId: supplierCompany.id,
      supplierNameSnapshot: "Precision Parts Inc.",
      createdById: "oem-admin",
    },
    {
      id: "fd-003",
      title: "Dashboard warning light flicker",
      description: "Intermittent flicker on the dashboard warning lights cluster. No actual fault detected in diagnostics. Cosmetic issue but causes customer concern.",
      source: "DEALER" as const,
      status: "DRAFT" as const,
      severity: "MINOR" as const,
      safetyImpact: false,
      vehicleDown: false,
      repeatIssue: false,
      oemId: oemCompany.id,
      createdById: "oem-quality",
    },
    {
      id: "fd-004",
      title: "Paint peeling on door handles",
      description: "Paint peeling observed on exterior door handles after 6 months of use. Affects multiple vehicles. Cosmetic quality issue.",
      source: "SERVICE" as const,
      status: "LINKED_TO_8D" as const,
      severity: "MINOR" as const,
      safetyImpact: false,
      vehicleDown: false,
      repeatIssue: true,
      vehicleModel: "Model S 2024",
      partNumber: "DH-1100-C",
      partName: "Exterior Door Handle Assembly",
      oemId: oemCompany.id,
      supplierId: supplierCompany2.id,
      supplierNameSnapshot: "SteelForged Co.",
      createdById: "oem-quality",
      linkedDefectId: "defect-001",
      convertedTo8DAt: new Date("2026-04-20"),
      convertedById: "oem-quality",
    },
  ]

  for (const fd of fieldDefects) {
    await prisma.fieldDefect.upsert({
      where: { id: fd.id },
      update: {},
      create: fd,
    })
  }

  console.log("Seed completed successfully!");
  console.log("Test accounts:");
  console.log("  admin@oem.com (OEM Admin)");
  console.log("  quality@oem.com (OEM Quality Engineer)");
  console.log("  admin@supplier.com (Supplier Admin)");
  console.log("  engineer@supplier.com (Supplier Engineer)");
  console.log("  admin@steelforged.com (SteelForged Admin)");
  console.log("  engineer@steelforged.com (SteelForged Engineer)");
  console.log(`\nSeeded ${defects.length} defects, ${ppapSubmissions.length} PPAPs, ${iqcReports.length} IQC reports, ${fmeas.length} FMEAs, ${fieldDefects.length} field defects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
