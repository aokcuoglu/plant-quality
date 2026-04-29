import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Companies ────────────────────────────────────────────────────

  const oemFreeCompany = await prisma.company.upsert({
    where: { id: "oem-free-company" },
    update: {},
    create: {
      id: "oem-free-company",
      name: "TestFree OEM Corp",
      type: "OEM",
      taxNumber: "1112223330",
      plan: "FREE",
    },
  });

  const oemProCompany = await prisma.company.upsert({
    where: { id: "oem-company" },
    update: { plan: "PRO" },
    create: {
      id: "oem-company",
      name: "PlantX Automotive",
      type: "OEM",
      taxNumber: "1234567890",
      plan: "PRO",
    },
  });

  const oemEnterpriseCompany = await prisma.company.upsert({
    where: { id: "oem-enterprise-company" },
    update: {},
    create: {
      id: "oem-enterprise-company",
      name: "Enterprise Motors Group",
      type: "OEM",
      taxNumber: "9998887770",
      plan: "ENTERPRISE",
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
      plan: "FREE",
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
      plan: "FREE",
    },
  });

  // ── Users ────────────────────────────────────────────────────────

  const users = [
    {
      id: "oem-free-admin",
      email: "admin-free@oem.com",
      name: "OEM Free Admin",
      role: "ADMIN" as const,
      companyId: oemFreeCompany.id,
    },
    {
      id: "oem-pro-admin",
      email: "admin-pro@oem.com",
      name: "OEM Pro Admin",
      role: "ADMIN" as const,
      companyId: oemProCompany.id,
    },
    {
      id: "oem-pro-qe",
      email: "qe-pro@oem.com",
      name: "OEM Pro Quality Engineer",
      role: "QUALITY_ENGINEER" as const,
      companyId: oemProCompany.id,
    },
    {
      id: "oem-enterprise-admin",
      email: "admin-enterprise@oem.com",
      name: "OEM Enterprise Admin",
      role: "ADMIN" as const,
      companyId: oemEnterpriseCompany.id,
    },
    {
      id: "oem-admin",
      email: "admin@oem.com",
      name: "OEM Admin",
      role: "ADMIN" as const,
      companyId: oemProCompany.id,
    },
    {
      id: "oem-quality",
      email: "quality@oem.com",
      name: "OEM Quality Engineer",
      role: "QUALITY_ENGINEER" as const,
      companyId: oemProCompany.id,
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

  // ── Defects (PRO OEM) ────────────────────────────────────────────

  const defects = [
    {
      id: "defect-001",
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "AX-7420-B",
      description: "Surface porosity exceeding acceptable limits on cylinder head casting. Multiple pits observed on sealing surface.",
      status: "OPEN" as const,
      oemOwnerId: "oem-quality",
      supplierResponseDueAt: new Date("2026-05-10"),
    },
    {
      id: "defect-002",
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "BR-1122-C",
      description: "Thread gauge failure on M12 bolts. Pitch diameter out of tolerance by 0.15mm.",
      status: "IN_PROGRESS" as const,
      oemOwnerId: "oem-pro-qe",
      supplierResponseDueAt: new Date("2026-04-20"),
    },
    {
      id: "defect-003",
      oemId: oemProCompany.id,
      supplierId: supplierCompany2.id,
      partNumber: "CS-3344-D",
      description: "Crack detected during ultrasonic testing on steering knuckle forging. Linear indication 8mm length in radius area.",
      status: "OPEN" as const,
      escalationLevel: "LEVEL_1" as const,
      escalatedAt: new Date("2026-04-22"),
      escalatedById: "oem-pro-admin",
      escalationReason: "Critical safety issue — no supplier response within SLA deadline",
    },
    {
      id: "defect-004",
      oemId: oemProCompany.id,
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
      update: { oemId: defect.oemId, supplierId: defect.supplierId, partNumber: defect.partNumber, description: defect.description, status: defect.status, oemOwnerId: defect.oemOwnerId ?? null, supplierResponseDueAt: defect.supplierResponseDueAt ?? null, escalationLevel: defect.escalationLevel ?? "NONE", escalatedAt: defect.escalatedAt ?? null, escalatedById: defect.escalatedById ?? null, escalationReason: defect.escalationReason ?? null, resolvedAt: defect.resolvedAt ?? null },
      create: defect,
    });
  }

  // ── Defects (FREE OEM) ────────────────────────────────────────────

  const freeDefects = [
    {
      id: "defect-free-001",
      oemId: oemFreeCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "FT-001-A",
      description: "Paint adhesion failure on interior trim panel. Bubbling observed after humidity test.",
      status: "OPEN" as const,
      oemOwnerId: "oem-free-admin",
      supplierResponseDueAt: new Date("2026-05-15"),
    },
    {
      id: "defect-free-002",
      oemId: oemFreeCompany.id,
      supplierId: supplierCompany2.id,
      partNumber: "FT-002-B",
      description: "Dimensional non-conformance on mounting bracket. Hole pattern offset by 0.3mm.",
      status: "IN_PROGRESS" as const,
      oemOwnerId: "oem-free-admin",
    },
  ];

  for (const defect of freeDefects) {
    await prisma.defect.upsert({
      where: { id: defect.id },
      update: {},
      create: defect,
    });
  }

  // ── Defects (ENTERPRISE OEM) ──────────────────────────────────────

  const enterpriseDefects = [
    {
      id: "defect-ent-001",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      partNumber: "ENG-5500-X",
      description: "Catastrophic bearing failure on transmission output shaft. Metal fatigue observed on inner race. Multiple vehicle reports.",
      status: "OPEN" as const,
      oemOwnerId: "oem-enterprise-admin",
      escalationLevel: "LEVEL_2" as const,
      escalatedAt: new Date("2026-04-20"),
      escalatedById: "oem-enterprise-admin",
      escalationReason: "Safety-critical failure with multiple field reports — immediate investigation required",
      supplierResponseDueAt: new Date("2026-05-05"),
    },
    {
      id: "defect-ent-002",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany2.id,
      partNumber: "ENG-7700-Y",
      description: "Corrosion pitting on suspension control arm after 12-month field exposure. Structural integrity concern.",
      status: "IN_PROGRESS" as const,
      oemOwnerId: "oem-enterprise-admin",
      supplierResponseDueAt: new Date("2026-05-12"),
    },
  ];

  for (const defect of enterpriseDefects) {
    await prisma.defect.upsert({
      where: { id: defect.id },
      update: {},
      create: defect,
    });
  }

  // ── 8D Reports ──────────────────────────────────────────────────────

  const eightDReports = [
    {
      id: "8d-001",
      defectId: "defect-002",
      d2_problem: "Thread gauge failure on M12 bolts — pitch diameter consistently out of tolerance by 0.15mm",
      d4_rootCause: "Tool wear on rolling die causing pitch diameter drift beyond specification",
      team: [
        { id: "tm1", name: "Alex Kim", role: "Lead QE", company: "PlantX Automotive" },
        { id: "tm2", name: "Sara Yilmaz", role: "Process Engineer", company: "Precision Parts Inc." },
      ],
      containmentActions: [
        { id: "ca1", action: "Quarantine affected lot and inspect 100% of remaining stock", owner: "OEM", dueDate: "2026-04-15", status: "COMPLETED" },
      ],
      d5Actions: [
        { id: "d5a1", action: "Replace rolling die and recalibrate tooling", owner: "SUPPLIER", dueDate: "2026-04-25", status: "IN_PROGRESS", contribution: 80 },
      ],
      d6Actions: [
        { id: "d6a1", action: "Verify first article after die replacement meets specification", owner: "OEM", dueDate: "2026-04-28", status: "PENDING", contribution: 100 },
      ],
      d7Impacts: { customerImpact: "Low — caught during IQC", recurrenceRisk: "Medium — tool wear is recurring" },
      d7Preventive: "Implement tool wear monitoring and preventive die replacement schedule",
      lastSubmittedAt: new Date("2026-04-18"),
      revisionNo: 1,
    },
    {
      id: "8d-002",
      defectId: "defect-ent-001",
      d2_problem: "Catastrophic bearing failure on transmission output shaft — inner race fatigue cracking observed",
      team: [
        { id: "tm3", name: "Maria Chen", role: "Senior QE", company: "Enterprise Motors Group" },
        { id: "tm4", name: "James Park", role: "Failure Analysis Lead", company: "Enterprise Motors Group" },
      ],
      containmentActions: [
        { id: "ca2", action: "Immediate field quarantine of affected VIN range", owner: "OEM", dueDate: "2026-04-22", status: "COMPLETED" },
        { id: "ca3", action: "Inspect all in-transit and warehouse stock", owner: "SUPPLIER", dueDate: "2026-04-24", status: "IN_PROGRESS" },
      ],
      d5Actions: [
        { id: "d5a2", action: "Increase inner race fillet radius from R2 to R4 per fatigue analysis", owner: "SUPPLIER", dueDate: "2026-05-10", status: "IN_PROGRESS", contribution: 60 },
        { id: "d5a3", action: "Add ultrasonic crack detection to 100% of production output", owner: "SUPPLIER", dueDate: "2026-05-05", status: "PENDING", contribution: 30 },
      ],
      d6Actions: [
        { id: "d6a2", action: "Run accelerated life test on redesigned bearing for 500k cycles", owner: "OEM", dueDate: "2026-06-01", status: "PENDING", contribution: 100 },
      ],
      d7Impacts: { customerImpact: "Critical — multiple vehicle failures, safety concern", recurrenceRisk: "High — design flaw in fillet radius" },
      d7Preventive: "Update bearing design specification to require minimum R4 fillet radius; add fatigue simulation to design review checklist",
      lastSubmittedAt: new Date("2026-04-23"),
      revisionNo: 2,
    },
  ];

  for (const report of eightDReports) {
    await prisma.eightDReport.deleteMany({ where: { defectId: report.defectId } }).catch(() => {});
    await prisma.eightDReport.create({ data: report });
  }

  // ── PPAP Submissions ───────────────────────────────────────────────

  const ppapSubmissions = [
    {
      id: "ppap-001",
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      revision: "A",
      level: "LEVEL_3" as const,
      status: "SUBMITTED" as const,
      oemId: oemProCompany.id,
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
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      oemOwnerId: "oem-pro-admin",
      defectId: "defect-002",
    },
    {
      id: "ppap-003",
      partNumber: "CS-3344-D",
      partName: "Steering Knuckle Forging",
      revision: "A",
      level: "LEVEL_3" as const,
      status: "APPROVED" as const,
      oemId: oemProCompany.id,
      supplierId: supplierCompany2.id,
      defectId: "defect-003",
      approvedById: "oem-quality",
      approvedAt: new Date("2026-01-15"),
    },
  ];

  for (const ppap of ppapSubmissions) {
    await prisma.ppapSubmission.upsert({
      where: { id: ppap.id },
      update: {},
      create: ppap,
    });
  }

  // ── IQC Reports ────────────────────────────────────────────────────

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
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      inspectorId: "oem-quality",
      defectId: "defect-001",
      inspectionDate: new Date("2026-04-10"),
      measurements: [
        { characteristic: "Surface Porosity", specification: "< 3 pits/cm²", measured: "8 pits/cm²", result: "FAIL" },
        { characteristic: "Surface Roughness (Ra)", specification: "1.6 um max", measured: "1.2 um", result: "PASS" },
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
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      inspectorId: "oem-quality",
      inspectionDate: new Date("2026-04-18"),
      measurements: [
        { characteristic: "Pitch Diameter", specification: "10.013-10.028mm", measured: "10.020mm", result: "PASS" },
        { characteristic: "Hardness (HRC)", specification: "32-38 HRC", measured: "35 HRC", result: "PASS" },
      ],
      completedAt: new Date("2026-04-19"),
    },
  ];

  for (const iqc of iqcReports) {
    await prisma.iqcReport.upsert({
      where: { id: iqc.id },
      update: {},
      create: iqc,
    });
  }

  // ── FMEAs ──────────────────────────────────────────────────────────

  const fmeas = [
    {
      id: "fmea-001",
      title: "Cylinder Head Casting Process FMEA",
      fmeaType: "PROCESS" as const,
      status: "DRAFT" as const,
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      processStep: "Casting - Gravity Die Casting",
      oemId: oemProCompany.id,
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
      oemId: oemProCompany.id,
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
  ];

  for (const fmea of fmeas) {
    await prisma.fmea.upsert({
      where: { id: fmea.id },
      update: {},
      create: fmea,
    });
  }

  // ── Field Defects (PRO OEM) ────────────────────────────────────────

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
      oemId: oemProCompany.id,
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
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      supplierNameSnapshot: "Precision Parts Inc.",
      createdById: "oem-pro-admin",
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
      oemId: oemProCompany.id,
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
      oemId: oemProCompany.id,
      supplierId: supplierCompany2.id,
      supplierNameSnapshot: "SteelForged Co.",
      createdById: "oem-quality",
      linkedDefectId: "defect-001",
      convertedTo8DAt: new Date("2026-04-20"),
      convertedById: "oem-quality",
    },
  ];

  for (const fd of fieldDefects) {
    await prisma.fieldDefect.upsert({
      where: { id: fd.id },
      update: { title: fd.title, description: fd.description, source: fd.source, status: fd.status, severity: fd.severity, safetyImpact: fd.safetyImpact, vehicleDown: fd.vehicleDown ?? false, repeatIssue: fd.repeatIssue ?? false, vin: fd.vin ?? null, vehicleModel: fd.vehicleModel ?? null, vehicleVariant: fd.vehicleVariant ?? null, mileage: fd.mileage ?? null, failureDate: fd.failureDate ?? null, reportDate: fd.reportDate, location: fd.location ?? null, partNumber: fd.partNumber ?? null, partName: fd.partName ?? null, oemId: fd.oemId, supplierId: fd.supplierId ?? null, supplierNameSnapshot: fd.supplierNameSnapshot ?? null, createdById: fd.createdById, linkedDefectId: fd.linkedDefectId ?? null, convertedTo8DAt: fd.convertedTo8DAt ?? null, convertedById: fd.convertedById ?? null },
      create: fd,
    });
  }

  // ── Field Defects (FREE OEM) ──────────────────────────────────────

  const freeFieldDefects = [
    {
      id: "fd-free-001",
      title: "Windshield wiper streaking",
      description: "Wiper blades leaving streaks on windshield after 3 months of use. Drivers report reduced visibility during rain.",
      source: "FIELD" as const,
      status: "OPEN" as const,
      severity: "MINOR" as const,
      safetyImpact: false,
      vehicleDown: false,
      repeatIssue: true,
      vehicleModel: "Compact 2025",
      partNumber: "WW-100-A",
      partName: "Front Wiper Blade Set",
      oemId: oemFreeCompany.id,
      supplierId: supplierCompany.id,
      supplierNameSnapshot: "Precision Parts Inc.",
      createdById: "oem-free-admin",
      reportDate: new Date("2026-04-25"),
    },
  ];

  for (const fd of freeFieldDefects) {
    await prisma.fieldDefect.upsert({
      where: { id: fd.id },
      update: {},
      create: fd,
    });
  }

  // ── Field Defects (ENTERPRISE OEM) ─────────────────────────────────

  const enterpriseFieldDefects = [
    {
      id: "fd-ent-001",
      title: "Transmission output shaft bearing failure",
      description: "Catastrophic bearing failure observed on multiple vehicles. Inner race fatigue cracking leading to complete bearing seizure. Safety-critical — immediate investigation and corrective action required.",
      source: "FIELD" as const,
      status: "SUPPLIER_ASSIGNED" as const,
      severity: "CRITICAL" as const,
      safetyImpact: true,
      vehicleDown: true,
      repeatIssue: true,
      vin: "ENG3CZWE000001",
      vehicleModel: "Flagship EV 2026",
      vehicleVariant: "Performance",
      mileage: 42000,
      failureDate: new Date("2026-04-15"),
      reportDate: new Date("2026-04-16"),
      location: "Detroit Service Center",
      partNumber: "ENG-5500-X",
      partName: "Transmission Output Shaft Bearing Assembly",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      supplierNameSnapshot: "Precision Parts Inc.",
      createdById: "oem-enterprise-admin",
    },
    {
      id: "fd-ent-002",
      title: "Suspension control arm corrosion",
      description: "Corrosion pitting observed on suspension control arms after 12-month field exposure in high-salt regions. Structural integrity may be compromised.",
      source: "CUSTOMER" as const,
      status: "OPEN" as const,
      severity: "MAJOR" as const,
      safetyImpact: true,
      vehicleDown: false,
      repeatIssue: false,
      vehicleModel: "Flagship EV 2025",
      partNumber: "ENG-7700-Y",
      partName: "Front Lower Control Arm",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany2.id,
      supplierNameSnapshot: "SteelForged Co.",
      createdById: "oem-enterprise-admin",
      reportDate: new Date("2026-04-20"),
    },
  ];

  for (const fd of enterpriseFieldDefects) {
    await prisma.fieldDefect.upsert({
      where: { id: fd.id },
      update: {},
      create: fd,
    });
  }

  // ── Usage Counters ─────────────────────────────────────────────────

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const usageCounters = [
    // FREE OEM — some usage to show limits being approached
    { companyId: oemFreeCompany.id, usageKey: "MONTHLY_DEFECTS", count: 18, periodStart, periodEnd },
    { companyId: oemFreeCompany.id, usageKey: "MONTHLY_FIELD_DEFECTS", count: 6, periodStart, periodEnd },
    { companyId: oemFreeCompany.id, usageKey: "SUPPLIERS", count: 2, periodStart, periodEnd },
    { companyId: oemFreeCompany.id, usageKey: "USERS", count: 1, periodStart, periodEnd },

    // PRO OEM — meaningful usage
    { companyId: oemProCompany.id, usageKey: "MONTHLY_DEFECTS", count: 42, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "MONTHLY_FIELD_DEFECTS", count: 15, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "SUPPLIERS", count: 8, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "USERS", count: 5, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "AI_CLASSIFICATION_RUNS", count: 320, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "SIMILAR_ISSUE_SEARCHES", count: 180, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "WAR_ROOM_ITEMS", count: 3, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "PPAP_PACKAGES", count: 2, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "FMEA_RECORDS", count: 4, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "IQC_INSPECTIONS", count: 12, periodStart, periodEnd },
    { companyId: oemProCompany.id, usageKey: "STORAGE_MB", count: 450, periodStart, periodEnd },

    // ENTERPRISE OEM — higher usage, shows unlimited works
    { companyId: oemEnterpriseCompany.id, usageKey: "MONTHLY_DEFECTS", count: 87, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "MONTHLY_FIELD_DEFECTS", count: 34, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "SUPPLIERS", count: 15, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "USERS", count: 12, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "AI_CLASSIFICATION_RUNS", count: 890, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "AI_8D_REVIEW_RUNS", count: 23, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "SIMILAR_ISSUE_SEARCHES", count: 456, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "WAR_ROOM_ITEMS", count: 8, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "PPAP_PACKAGES", count: 7, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "FMEA_RECORDS", count: 12, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "IQC_INSPECTIONS", count: 28, periodStart, periodEnd },
    { companyId: oemEnterpriseCompany.id, usageKey: "STORAGE_MB", count: 2800, periodStart, periodEnd },
  ];

  for (const counter of usageCounters) {
    await prisma.usageCounter.upsert({
      where: {
        companyId_usageKey_periodStart_periodEnd: {
          companyId: counter.companyId,
          usageKey: counter.usageKey,
          periodStart: counter.periodStart,
          periodEnd: counter.periodEnd,
        },
      },
      update: { count: counter.count },
      create: counter,
    });
  }

  // ── Summary ────────────────────────────────────────────────────────

  console.log("v2.0.3 Seed completed successfully!");
  console.log("");
  console.log("=== Test Accounts (Dev Credentials) ===");
  console.log("");
  console.log("FREE OEM:");
  console.log("  admin-free@oem.com    — TestFree OEM Corp (FREE plan, OEM Admin)");
  console.log("");
  console.log("PRO OEM:");
  console.log("  admin-pro@oem.com     — PlantX Automotive (PRO plan, OEM Admin)");
  console.log("  qe-pro@oem.com        — PlantX Automotive (PRO plan, OEM QE)");
  console.log("  admin@oem.com         — PlantX Automotive (PRO plan, OEM Admin) [legacy]");
  console.log("  quality@oem.com       — PlantX Automotive (PRO plan, OEM QE) [legacy]");
  console.log("");
  console.log("ENTERPRISE OEM:");
  console.log("  admin-enterprise@oem.com — Enterprise Motors Group (ENTERPRISE plan, OEM Admin)");
  console.log("");
  console.log("SUPPLIER:");
  console.log("  admin@supplier.com    — Precision Parts Inc. (FREE, Supplier Admin)");
  console.log("  engineer@supplier.com — Precision Parts Inc. (FREE, Supplier QE)");
  console.log("  admin@steelforged.com — SteelForged Co. (FREE, Supplier Admin)");
  console.log("  engineer@steelforged.com — SteelForged Co. (FREE, Supplier QE)");
  console.log("");
  console.log(`Seeded: ${defects.length + freeDefects.length + enterpriseDefects.length} defects, ${ppapSubmissions.length} PPAPs, ${iqcReports.length} IQC reports, ${fmeas.length} FMEAs, ${fieldDefects.length + freeFieldDefects.length + enterpriseFieldDefects.length} field defects, ${eightDReports.length} 8D reports, ${usageCounters.length} usage counters.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });