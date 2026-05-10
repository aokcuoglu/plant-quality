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
      id: "oem-enterprise-qe",
      email: "qe-enterprise@oem.com",
      name: "Enterprise QE Engineer",
      role: "QUALITY_ENGINEER" as const,
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
      requestNumber: "PPAP-LZ7K9M",
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      revision: "A",
      level: "LEVEL_3" as const,
      reasonForSubmission: "NEW_PART" as const,
      status: "SUBMITTED" as const,
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      oemOwnerId: "oem-quality",
      supplierAssigneeId: "supplier-engineer",
      defectId: "defect-001",
      dueDate: new Date("2026-05-30"),
      submittedAt: new Date("2026-04-28"),
      projectName: null,
      vehicleModel: null,
      revisionLevel: null,
      drawingNumber: null,
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
      requestNumber: "PPAP-MH4F2X",
      partNumber: "BR-1122-C",
      partName: "M12 Hex Bolt",
      revision: "B",
      level: "LEVEL_2" as const,
      reasonForSubmission: "ENGINEERING_CHANGE" as const,
      status: "REQUESTED" as const,
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      oemOwnerId: "oem-pro-admin",
      defectId: "defect-002",
      projectName: null,
      vehicleModel: null,
      revisionLevel: null,
      drawingNumber: null,
    },
    {
      id: "ppap-003",
      requestNumber: "PPAP-QJ8R5N",
      partNumber: "CS-3344-D",
      partName: "Steering Knuckle Forging",
      revision: "A",
      level: "LEVEL_3" as const,
      reasonForSubmission: "SUPPLIER_CHANGE" as const,
      status: "APPROVED" as const,
      oemId: oemProCompany.id,
      supplierId: supplierCompany2.id,
      defectId: "defect-003",
      approvedById: "oem-quality",
      approvedAt: new Date("2026-01-15"),
      reviewedAt: new Date("2026-01-14"),
      reviewedById: "oem-quality",
      submittedAt: new Date("2026-01-10"),
      projectName: null,
      vehicleModel: null,
      revisionLevel: null,
      drawingNumber: null,
      requirements: {
        DESIGN_RECORDS: true,
        PROCESS_FLOW_DIAGRAM: true,
        PROCESS_FMEA: true,
        CONTROL_PLAN: true,
        MEASUREMENT_SYSTEM_ANALYSIS: true,
        DIMENSIONAL_RESULTS: true,
        MATERIAL_PERFORMANCE_RESULTS: true,
        INITIAL_PROCESS_STUDY: true,
        PART_SUBMISSION_WARRANT: true,
      },
    },
    {
      id: "ppap-004",
      requestNumber: "PPAP-ENTER-VK3T",
      partNumber: "ENG-5500-X",
      partName: "Transmission Output Shaft Bearing Assembly",
      projectName: "Flagship EV Platform",
      vehicleModel: "Flagship EV 2026",
      revision: "C",
      revisionLevel: "Rev C",
      drawingNumber: "DWG-5500-001",
      level: "LEVEL_4" as const,
      reasonForSubmission: "CORRECTIVE_ACTION_FOLLOW_UP" as const,
      status: "UNDER_REVIEW" as const,
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      oemOwnerId: "oem-enterprise-admin",
      supplierAssigneeId: "supplier-engineer",
      dueDate: new Date("2026-06-15"),
      submittedAt: new Date("2026-04-25"),
      requirements: {
        DESIGN_RECORDS: true,
        ENGINEERING_CHANGE_DOCUMENTS: true,
        DESIGN_FMEA: true,
        PROCESS_FLOW_DIAGRAM: true,
        PROCESS_FMEA: true,
        CONTROL_PLAN: true,
        MEASUREMENT_SYSTEM_ANALYSIS: true,
        DIMENSIONAL_RESULTS: true,
        MATERIAL_PERFORMANCE_RESULTS: true,
        INITIAL_PROCESS_STUDY: true,
        QUALIFIED_LABORATORY_DOCUMENTATION: true,
        PART_SUBMISSION_WARRANT: true,
      },
    },
  ];

  for (const ppap of ppapSubmissions) {
    const ppapData = {
      ...ppap,
      projectName: ppap.projectName ?? null,
      vehicleModel: ppap.vehicleModel ?? null,
      revisionLevel: ppap.revisionLevel ?? null,
      drawingNumber: ppap.drawingNumber ?? null,
    };
    await prisma.ppapSubmission.upsert({
      where: { id: ppap.id },
      update: { requestNumber: ppap.requestNumber, partNumber: ppap.partNumber, partName: ppap.partName, level: ppap.level, reasonForSubmission: ppap.reasonForSubmission, status: ppap.status, oemId: ppap.oemId, supplierId: ppap.supplierId, oemOwnerId: ppap.oemOwnerId ?? null, supplierAssigneeId: ppap.supplierAssigneeId ?? null, defectId: ppap.defectId ?? null, dueDate: ppap.dueDate ?? null, submittedAt: ppap.submittedAt ?? null, approvedAt: ppap.approvedAt ?? null, approvedById: ppap.approvedById ?? null, reviewedAt: ppap.reviewedAt ?? null, reviewedById: ppap.reviewedById ?? null, requirements: ppap.requirements ?? undefined, projectName: ppap.projectName ?? null, vehicleModel: ppap.vehicleModel ?? null, revisionLevel: ppap.revisionLevel ?? null, drawingNumber: ppap.drawingNumber ?? null },
      create: ppapData as Parameters<typeof prisma.ppapSubmission.create>[0]["data"],
    });
  }

  // ── PPAP Evidence (Document Checklist) ──────────────────────────────

  // ppap-001: SUBMITTED - mix of UPLOADED, APPROVED, MISSING
  const ppap001Evidences = [
    { id: "ppe-001-01", ppapId: "ppap-001", requirement: "DESIGN_RECORDS" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/design-records.pdf", fileName: "design-records.pdf", mimeType: "application/pdf", sizeBytes: 245000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-001-02", ppapId: "ppap-001", requirement: "PROCESS_FLOW_DIAGRAM" as const, status: "APPROVED" as const, storageKey: "ppap/mock/process-flow.pdf", fileName: "process-flow.pdf", mimeType: "application/pdf", sizeBytes: 128000, uploadedById: "supplier-engineer", companyId: supplierCompany.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-04-29") },
    { id: "ppe-001-03", ppapId: "ppap-001", requirement: "PROCESS_FMEA" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/process-fmea.pdf", fileName: "process-fmea.pdf", mimeType: "application/pdf", sizeBytes: 310000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-001-04", ppapId: "ppap-001", requirement: "CONTROL_PLAN" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/control-plan.pdf", fileName: "control-plan.pdf", mimeType: "application/pdf", sizeBytes: 187000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-001-05", ppapId: "ppap-001", requirement: "MEASUREMENT_SYSTEM_ANALYSIS" as const, status: "MISSING" as const, companyId: oemProCompany.id },
    { id: "ppe-001-06", ppapId: "ppap-001", requirement: "DIMENSIONAL_RESULTS" as const, status: "MISSING" as const, companyId: oemProCompany.id },
    { id: "ppe-001-07", ppapId: "ppap-001", requirement: "MATERIAL_PERFORMANCE_RESULTS" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/material-results.pdf", fileName: "material-results.pdf", mimeType: "application/pdf", sizeBytes: 95000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-001-08", ppapId: "ppap-001", requirement: "PART_SUBMISSION_WARRANT" as const, status: "MISSING" as const, companyId: oemProCompany.id },
  ];

  // ppap-002: REQUESTED - all MISSING
  const ppap002Evidences = [
    { id: "ppe-002-01", ppapId: "ppap-002", requirement: "DESIGN_RECORDS" as const, status: "MISSING" as const, companyId: oemProCompany.id },
    { id: "ppe-002-02", ppapId: "ppap-002", requirement: "PROCESS_FLOW_DIAGRAM" as const, status: "MISSING" as const, companyId: oemProCompany.id },
    { id: "ppe-002-03", ppapId: "ppap-002", requirement: "PART_SUBMISSION_WARRANT" as const, status: "MISSING" as const, companyId: oemProCompany.id },
  ];

  // ppap-003: APPROVED - all APPROVED
  const ppap003Evidences = [
    { id: "ppe-003-01", ppapId: "ppap-003", requirement: "DESIGN_RECORDS" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-design.pdf", fileName: "cs-design-records.pdf", mimeType: "application/pdf", sizeBytes: 280000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-02", ppapId: "ppap-003", requirement: "PROCESS_FLOW_DIAGRAM" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-flow.pdf", fileName: "cs-process-flow.pdf", mimeType: "application/pdf", sizeBytes: 145000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-03", ppapId: "ppap-003", requirement: "PROCESS_FMEA" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-fmea.pdf", fileName: "cs-process-fmea.pdf", mimeType: "application/pdf", sizeBytes: 350000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-04", ppapId: "ppap-003", requirement: "CONTROL_PLAN" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-cp.pdf", fileName: "cs-control-plan.pdf", mimeType: "application/pdf", sizeBytes: 190000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-05", ppapId: "ppap-003", requirement: "MEASUREMENT_SYSTEM_ANALYSIS" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-msa.pdf", fileName: "cs-msa.pdf", mimeType: "application/pdf", sizeBytes: 88000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-06", ppapId: "ppap-003", requirement: "DIMENSIONAL_RESULTS" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-dim.pdf", fileName: "cs-dimensional-results.pdf", mimeType: "application/pdf", sizeBytes: 210000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-07", ppapId: "ppap-003", requirement: "MATERIAL_PERFORMANCE_RESULTS" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-mat.pdf", fileName: "cs-material-results.pdf", mimeType: "application/pdf", sizeBytes: 165000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-08", ppapId: "ppap-003", requirement: "INITIAL_PROCESS_STUDY" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-spc.pdf", fileName: "cs-initial-process-study.pdf", mimeType: "application/pdf", sizeBytes: 120000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
    { id: "ppe-003-09", ppapId: "ppap-003", requirement: "PART_SUBMISSION_WARRANT" as const, status: "APPROVED" as const, storageKey: "ppap/mock/cs-psw.pdf", fileName: "cs-psw.pdf", mimeType: "application/pdf", sizeBytes: 75000, uploadedById: "steelforged-engineer", companyId: supplierCompany2.id, reviewedById: "oem-quality", reviewedAt: new Date("2026-01-14") },
  ];

  // ppap-004: UNDER_REVIEW - mix of APPROVED and REVISION_REQUIRED
  const ppap004Evidences = [
    { id: "ppe-004-01", ppapId: "ppap-004", requirement: "DESIGN_RECORDS" as const, status: "APPROVED" as const, storageKey: "ppap/mock/eng-design.pdf", fileName: "eng-design-records.pdf", mimeType: "application/pdf", sizeBytes: 320000, uploadedById: "supplier-engineer", companyId: supplierCompany.id, reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-04-27") },
    { id: "ppe-004-02", ppapId: "ppap-004", requirement: "ENGINEERING_CHANGE_DOCUMENTS" as const, status: "APPROVED" as const, storageKey: "ppap/mock/eng-ecn.pdf", fileName: "eng-ecn.pdf", mimeType: "application/pdf", sizeBytes: 95000, uploadedById: "supplier-engineer", companyId: supplierCompany.id, reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-04-27") },
    { id: "ppe-004-03", ppapId: "ppap-004", requirement: "DESIGN_FMEA" as const, status: "REVISION_REQUIRED" as const, storageKey: "ppap/mock/eng-dfmea.pdf", fileName: "eng-dfmea.pdf", mimeType: "application/pdf", sizeBytes: 280000, uploadedById: "supplier-engineer", companyId: supplierCompany.id, oemComment: "RPN for item 3 exceeds threshold. Please update and resubmit.", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-04-28") },
    { id: "ppe-004-04", ppapId: "ppap-004", requirement: "PROCESS_FLOW_DIAGRAM" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/eng-pfd.pdf", fileName: "eng-process-flow.pdf", mimeType: "application/pdf", sizeBytes: 150000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-004-05", ppapId: "ppap-004", requirement: "PROCESS_FMEA" as const, status: "MISSING" as const, companyId: oemEnterpriseCompany.id },
    { id: "ppe-004-06", ppapId: "ppap-004", requirement: "CONTROL_PLAN" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/eng-cp.pdf", fileName: "eng-control-plan.pdf", mimeType: "application/pdf", sizeBytes: 195000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-004-07", ppapId: "ppap-004", requirement: "MEASUREMENT_SYSTEM_ANALYSIS" as const, status: "MISSING" as const, companyId: oemEnterpriseCompany.id },
    { id: "ppe-004-08", ppapId: "ppap-004", requirement: "DIMENSIONAL_RESULTS" as const, status: "UPLOADED" as const, storageKey: "ppap/mock/eng-dim.pdf", fileName: "eng-dimensional-results.pdf", mimeType: "application/pdf", sizeBytes: 225000, uploadedById: "supplier-engineer", companyId: supplierCompany.id },
    { id: "ppe-004-09", ppapId: "ppap-004", requirement: "MATERIAL_PERFORMANCE_RESULTS" as const, status: "MISSING" as const, companyId: oemEnterpriseCompany.id },
    { id: "ppe-004-10", ppapId: "ppap-004", requirement: "INITIAL_PROCESS_STUDY" as const, status: "MISSING" as const, companyId: oemEnterpriseCompany.id },
    { id: "ppe-004-11", ppapId: "ppap-004", requirement: "QUALIFIED_LABORATORY_DOCUMENTATION" as const, status: "MISSING" as const, companyId: oemEnterpriseCompany.id },
    { id: "ppe-004-12", ppapId: "ppap-004", requirement: "PART_SUBMISSION_WARRANT" as const, status: "MISSING" as const, companyId: oemEnterpriseCompany.id },
  ];

  const allPpapEvidences: Parameters<typeof prisma.ppapEvidence.create>[0]["data"][] = [...ppap001Evidences, ...ppap002Evidences, ...ppap003Evidences, ...ppap004Evidences] as Parameters<typeof prisma.ppapEvidence.create>[0]["data"][];

  for (const ev of allPpapEvidences) {
    await prisma.ppapEvidence.upsert({
      where: { id: ev.id! },
      update: { status: ev.status, storageKey: ev.storageKey ?? null, fileName: ev.fileName ?? null, mimeType: ev.mimeType ?? null, sizeBytes: ev.sizeBytes ?? null, uploadedById: ev.uploadedById ?? null, reviewedById: ev.reviewedById ?? null, reviewedAt: ev.reviewedAt ?? null, oemComment: ev.oemComment ?? null },
      create: ev,
    });
  }

  // ── PPAP Events ─────────────────────────────────────────────────────

  const ppapEvents = [
    { id: "ppe-evt-001", ppapId: "ppap-001", type: "PPAP_CREATED" as const, actorId: "oem-quality", metadata: { partNumber: "AX-7420-B", requestNumber: "PPAP-LZ7K9M" } },
    { id: "ppe-evt-002", ppapId: "ppap-001", type: "PPAP_SUBMITTED" as const, actorId: "supplier-engineer", metadata: { partNumber: "AX-7420-B" } },
    { id: "ppe-evt-003", ppapId: "ppap-002", type: "PPAP_CREATED" as const, actorId: "oem-pro-admin", metadata: { partNumber: "BR-1122-C", requestNumber: "PPAP-MH4F2X" } },
    { id: "ppe-evt-004", ppapId: "ppap-003", type: "PPAP_CREATED" as const, actorId: "oem-quality", metadata: { partNumber: "CS-3344-D", requestNumber: "PPAP-QJ8R5N" } },
    { id: "ppe-evt-005", ppapId: "ppap-003", type: "PPAP_SUBMITTED" as const, actorId: "steelforged-engineer", metadata: { partNumber: "CS-3344-D" } },
    { id: "ppe-evt-006", ppapId: "ppap-003", type: "PPAP_APPROVED" as const, actorId: "oem-quality", metadata: { partNumber: "CS-3344-D" } },
    { id: "ppe-evt-007", ppapId: "ppap-004", type: "PPAP_CREATED" as const, actorId: "oem-enterprise-admin", metadata: { partNumber: "ENG-5500-X", requestNumber: "PPAP-ENTER-VK3T" } },
    { id: "ppe-evt-008", ppapId: "ppap-004", type: "PPAP_SUBMITTED" as const, actorId: "supplier-engineer", metadata: { partNumber: "ENG-5500-X" } },
  ];

  for (const evt of ppapEvents) {
    await prisma.ppapEvent.upsert({
      where: { id: evt.id },
      update: {},
      create: evt,
    });
  }

  // ── IQC Reports ────────────────────────────────────────────────────

  // Delete old checklist items first (dependent records)
  await prisma.iqcChecklistItem.deleteMany({});
  await prisma.iqcEvent.deleteMany({ where: { reportId: { in: ["iqc-001", "iqc-002", "iqc-003"] } } });
  await prisma.iqcReport.deleteMany({ where: { id: { in: ["iqc-001", "iqc-002", "iqc-003"] } } });

  const iqcReports = [
    {
      id: "iqc-001",
      inspectionNumber: "IQC-2026-0001",
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      lotNumber: "LOT-2026-0042",
      quantityReceived: 50,
      inspectionQuantity: 10,
      status: "COMPLETED" as const,
      result: "REJECTED" as const,
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      inspectorId: "oem-quality",
      inspectionDate: new Date("2026-04-10"),
      inspectionType: "RECEIVING_INSPECTION" as const,
      linkedDefectId: "defect-001",
      createdById: "oem-quality",
      completedById: "oem-quality",
      quantityAccepted: 45,
      quantityRejected: 5,
      dispositionNotes: "Reject entire lot. Surface porosity exceeds acceptable limits on 5 units.",
      completedAt: new Date("2026-04-12"),
    },
    {
      id: "iqc-002",
      inspectionNumber: "IQC-2026-0002",
      partNumber: "BR-1122-C",
      partName: "M12 Hex Bolt",
      lotNumber: "LOT-2026-0055",
      quantityReceived: 200,
      inspectionQuantity: 20,
      status: "COMPLETED" as const,
      result: "ACCEPTED" as const,
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      inspectorId: "oem-quality",
      inspectionDate: new Date("2026-04-18"),
      inspectionType: "RECEIVING_INSPECTION" as const,
      createdById: "oem-quality",
      completedById: "oem-quality",
      quantityAccepted: 200,
      quantityRejected: 0,
      completedAt: new Date("2026-04-19"),
    },
    {
      id: "iqc-003",
      inspectionNumber: "IQC-2026-0003",
      partNumber: "CS-3344-D",
      partName: "Steering Knuckle Forging",
      lotNumber: "LOT-2026-0078",
      quantityReceived: 30,
      inspectionQuantity: 8,
      status: "IN_PROGRESS" as const,
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany2.id,
      inspectorId: "oem-enterprise-admin",
      inspectionDate: new Date("2026-04-28"),
      inspectionType: "FIRST_ARTICLE_INSPECTION" as const,
      createdById: "oem-enterprise-admin",
    },
  ];

  for (const iqc of iqcReports) {
    await prisma.iqcReport.create({ data: iqc });
  }

  // IQC Checklist Items
  const iqcChecklistItems = [
    // iqc-001 (COMPLETED/REJECTED) - mixed results
    { id: "iqc-cli-001-01", iqcInspectionId: "iqc-001", itemName: "Packaging Condition", requirement: "No visible damage, contamination, or deterioration on packaging", result: "OK" as const },
    { id: "iqc-cli-001-02", iqcInspectionId: "iqc-001", itemName: "Label / Traceability Check", requirement: "Labels match PO, part number, lot/batch number, and supplier ID", result: "OK" as const },
    { id: "iqc-cli-001-03", iqcInspectionId: "iqc-001", itemName: "Visual Inspection", requirement: "No visible defects, discoloration, foreign material, or surface irregularities", result: "NOK" as const, comment: "Surface porosity observed on 5 units" },
    { id: "iqc-cli-001-04", iqcInspectionId: "iqc-001", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances per drawing", result: "OK" as const },
    { id: "iqc-cli-001-05", iqcInspectionId: "iqc-001", itemName: "Functional Check", requirement: "Part functions as intended per specification", result: "NA" as const },
    { id: "iqc-cli-001-06", iqcInspectionId: "iqc-001", itemName: "Material Certificate Check", requirement: "Material certification/test report matches specification", result: "OK" as const },
    { id: "iqc-cli-001-07", iqcInspectionId: "iqc-001", itemName: "Quantity Check", requirement: "Received quantity matches PO quantity", result: "OK" as const },
    { id: "iqc-cli-001-08", iqcInspectionId: "iqc-001", itemName: "Damage Check", requirement: "No shipping damage, dents, scratches, or impact marks", result: "NOK" as const, comment: "3 units with visible transit damage" },
    { id: "iqc-cli-001-09", iqcInspectionId: "iqc-001", itemName: "Special Characteristic Check", requirement: "Safety or regulatory critical characteristics verified per control plan", result: "NOK" as const, comment: "Sealing surface porosity exceeds limit" },

    // iqc-002 (COMPLETED/ACCEPTED) - all OK
    { id: "iqc-cli-002-01", iqcInspectionId: "iqc-002", itemName: "Packaging Condition", requirement: "No visible damage, contamination, or deterioration on packaging", result: "OK" as const },
    { id: "iqc-cli-002-02", iqcInspectionId: "iqc-002", itemName: "Label / Traceability Check", requirement: "Labels match PO, part number, lot/batch number, and supplier ID", result: "OK" as const },
    { id: "iqc-cli-002-03", iqcInspectionId: "iqc-002", itemName: "Visual Inspection", requirement: "No visible defects, discoloration, foreign material, or surface irregularities", result: "OK" as const },
    { id: "iqc-cli-002-04", iqcInspectionId: "iqc-002", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances per drawing", result: "OK" as const },
    { id: "iqc-cli-002-05", iqcInspectionId: "iqc-002", itemName: "Functional Check", requirement: "Part functions as intended per specification", result: "OK" as const },
    { id: "iqc-cli-002-06", iqcInspectionId: "iqc-002", itemName: "Material Certificate Check", requirement: "Material certification/test report matches specification", result: "OK" as const },
    { id: "iqc-cli-002-07", iqcInspectionId: "iqc-002", itemName: "Quantity Check", requirement: "Received quantity matches PO quantity", result: "OK" as const },
    { id: "iqc-cli-002-08", iqcInspectionId: "iqc-002", itemName: "Damage Check", requirement: "No shipping damage, dents, scratches, or impact marks", result: "OK" as const },
    { id: "iqc-cli-002-09", iqcInspectionId: "iqc-002", itemName: "Special Characteristic Check", requirement: "Safety or regulatory critical characteristics verified per control plan", result: "OK" as const },

    // iqc-003 (IN_PROGRESS) - some pending, some results
    { id: "iqc-cli-003-01", iqcInspectionId: "iqc-003", itemName: "Packaging Condition", requirement: "No visible damage, contamination, or deterioration on packaging", result: "OK" as const },
    { id: "iqc-cli-003-02", iqcInspectionId: "iqc-003", itemName: "Label / Traceability Check", requirement: "Labels match PO, part number, lot/batch number, and supplier ID", result: "OK" as const },
    { id: "iqc-cli-003-03", iqcInspectionId: "iqc-003", itemName: "Visual Inspection", requirement: "No visible defects, discoloration, foreign material, or surface irregularities", result: "PENDING" as const },
    { id: "iqc-cli-003-04", iqcInspectionId: "iqc-003", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances per drawing", result: "PENDING" as const },
    { id: "iqc-cli-003-05", iqcInspectionId: "iqc-003", itemName: "Functional Check", requirement: "Part functions as intended per specification", result: "PENDING" as const },
    { id: "iqc-cli-003-06", iqcInspectionId: "iqc-003", itemName: "Material Certificate Check", requirement: "Material certification/test report matches specification", result: "NA" as const },
    { id: "iqc-cli-003-07", iqcInspectionId: "iqc-003", itemName: "Quantity Check", requirement: "Received quantity matches PO quantity", result: "PENDING" as const },
    { id: "iqc-cli-003-08", iqcInspectionId: "iqc-003", itemName: "Damage Check", requirement: "No shipping damage, dents, scratches, or impact marks", result: "PENDING" as const },
    { id: "iqc-cli-003-09", iqcInspectionId: "iqc-003", itemName: "Special Characteristic Check", requirement: "Safety or regulatory critical characteristics verified per control plan", result: "PENDING" as const },
  ];

  for (const item of iqcChecklistItems) {
    await prisma.iqcChecklistItem.create({ data: item });
  }

  // IQC Events
  const iqcEvents = [
    { id: "iqc-evt-001", reportId: "iqc-001", type: "IQC_CREATED" as const, actorId: "oem-quality", metadata: { inspectionNumber: "IQC-2026-0001", partNumber: "AX-7420-B" } },
    { id: "iqc-evt-002", reportId: "iqc-001", type: "IQC_COMPLETED" as const, actorId: "oem-quality", metadata: { inspectionNumber: "IQC-2026-0001", result: "REJECTED" } },
    { id: "iqc-evt-003", reportId: "iqc-002", type: "IQC_CREATED" as const, actorId: "oem-quality", metadata: { inspectionNumber: "IQC-2026-0002", partNumber: "BR-1122-C" } },
    { id: "iqc-evt-004", reportId: "iqc-002", type: "IQC_COMPLETED" as const, actorId: "oem-quality", metadata: { inspectionNumber: "IQC-2026-0002", result: "ACCEPTED" } },
    { id: "iqc-evt-005", reportId: "iqc-003", type: "IQC_CREATED" as const, actorId: "oem-enterprise-admin", metadata: { inspectionNumber: "IQC-2026-0003", partNumber: "CS-3344-D" } },
  ];

  for (const evt of iqcEvents) {
    await prisma.iqcEvent.create({ data: evt });
  }

  // ── FMEAs ──────────────────────────────────────────────────────────

  const fmeas = [
    {
      id: "fmea-001",
      fmeaNumber: "FMEA-2026-0001",
      title: "Cylinder Head Casting Process FMEA",
      fmeaType: "PROCESS" as const,
      status: "SUPPLIER_IN_PROGRESS" as const,
      partNumber: "AX-7420-B",
      partName: "Cylinder Head Casting",
      processName: "Casting - Gravity Die Casting",
      oemId: oemProCompany.id,
      supplierId: supplierCompany.id,
      responsibleId: "supplier-engineer",
      createdById: "oem-quality",
      dueDate: new Date("2026-06-15"),
      defectId: "defect-001",
      rows: [
        {
          id: "row_1",
          processStep: "Mold preparation",
          failureMode: "Mold surface contamination",
          failureEffect: "Surface porosity defect on casting",
          severity: 8,
          failureCause: "Inadequate mold cleaning procedure",
          occurrence: 5,
          preventionControl: "Visual inspection after mold preparation",
          detectionControl: "Visual inspection",
          detection: 4,
          rpn: 160,
          recommendedAction: "Implement ultrasonic mold surface cleaning",
          actionOwner: "supplier-engineer",
          targetDate: "2026-05-15",
          actionStatus: "OPEN",
          supplierComment: "Evaluating ultrasonic cleaning equipment cost",
        },
        {
          id: "row_2",
          processStep: "Pouring",
          failureMode: "Insufficient pouring temperature",
          failureEffect: "Cold shuts and incomplete filling",
          severity: 7,
          failureCause: "Temperature measurement error",
          occurrence: 3,
          preventionControl: "Thermocouple monitoring",
          detectionControl: "Temperature logging system",
          detection: 3,
          rpn: 63,
          recommendedAction: "Add redundant temperature sensor",
          actionOwner: "supplier-engineer",
          actionStatus: "IN_PROGRESS",
          targetDate: "2026-06-01",
        },
        {
          id: "row_3",
          processStep: "Heat treatment",
          failureMode: "Uneven cooling rate",
          failureEffect: "Residual stress causing warpage",
          severity: 9,
          failureCause: "Non-uniform quenching pattern",
          occurrence: 4,
          preventionControl: "Standardized quenching procedure",
          detectionControl: "Dimensional inspection post-quench",
          detection: 5,
          rpn: 180,
          recommendedAction: "Redesign quench fixture for uniform cooling",
          actionOwner: "oem-quality",
          actionStatus: "OPEN",
          targetDate: "2026-07-01",
          oemComment: "Priority — safety-related potential failure",
        },
      ],
    },
    {
      id: "fmea-002",
      fmeaNumber: "FMEA-2026-0002",
      title: "Steering Knuckle Design FMEA",
      fmeaType: "DESIGN" as const,
      status: "APPROVED" as const,
      partNumber: "CS-3344-D",
      partName: "Steering Knuckle Forging",
      projectName: "EV Platform Alpha",
      vehicleModel: "Model S 2026",
      oemId: oemProCompany.id,
      supplierId: supplierCompany2.id,
      responsibleId: "steelforged-engineer",
      approvedById: "oem-quality",
      reviewedById: "oem-quality",
      approvedAt: new Date("2026-01-20"),
      reviewedAt: new Date("2026-01-18"),
      submittedAt: new Date("2026-01-15"),
      createdById: "oem-quality",
      rows: [
        {
          id: "row_1",
          failureMode: "Fatigue crack at radius",
          failureEffect: "Steering failure — safety critical",
          severity: 10,
          failureCause: "Stress concentration at fillet radius",
          occurrence: 2,
          preventionControl: "Ultrasonic testing per lot",
          detectionControl: "Fatigue testing per batch",
          detection: 2,
          rpn: 40,
          recommendedAction: "Increase fillet radius from R3 to R5",
          actionOwner: "steelforged-engineer",
          actionStatus: "COMPLETED",
          revisedSeverity: 10,
          revisedOccurrence: 1,
          revisedDetection: 2,
          revisedRpn: 20,
        },
      ],
    },
    {
      id: "fmea-003",
      fmeaNumber: "FMEA-2026-0003",
      title: "Battery Tray Stamping Process FMEA",
      fmeaType: "PROCESS" as const,
      status: "REQUESTED" as const,
      partNumber: "BT-8821-A",
      partName: "Battery Tray Assembly",
      processName: "Stamping - Deep Draw",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      responsibleId: "supplier-engineer",
      createdById: "oem-enterprise-admin",
      dueDate: new Date("2026-08-01"),
      notes: "New battery tray for EV platform. Requires thorough PFMEA before SOP.",
      rows: [] as Record<string, unknown>[],
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const fmea of fmeas) {
    await prisma.fmea.upsert({
      where: { id: fmea.id },
      update: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: fmea as any,
    });
  }

  // ── FMEA Events ───────────────────────────────────────────────────

  const fmeaEvents = [
    { id: "fmea-evt-001", fmeaId: "fmea-001", type: "FMEA_CREATED" as const, actorId: "oem-quality", metadata: { title: "Cylinder Head Casting Process FMEA" } },
    { id: "fmea-evt-002", fmeaId: "fmea-002", type: "FMEA_CREATED" as const, actorId: "oem-quality", metadata: { title: "Steering Knuckle Design FMEA" } },
    { id: "fmea-evt-003", fmeaId: "fmea-002", type: "FMEA_SUBMITTED" as const, actorId: "steelforged-engineer", metadata: { action: "submitted_for_review" } },
    { id: "fmea-evt-004", fmeaId: "fmea-002", type: "FMEA_APPROVED" as const, actorId: "oem-quality", metadata: { action: "approved", maxRpn: 40 } },
    { id: "fmea-evt-005", fmeaId: "fmea-003", type: "FMEA_CREATED" as const, actorId: "oem-enterprise-admin", metadata: { title: "Battery Tray Stamping Process FMEA" } },
  ];

  for (const evt of fmeaEvents) {
    await prisma.fmeaEvent.upsert({
      where: { id: evt.id },
      update: {},
      create: evt,
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

  // ── v2.5.3 Linkage Demo Data ────────────────────────────────────────

  // Scenario A: Strong linkage — same supplier + same part across all record types
  const linkageFd = {
    id: "fd-linkage-a",
    title: "Cylinder head porosity after field service",
    description: "Customer reports oil seepage from cylinder head sealing surface after 8000 km. Porosity pits observed on machined face, consistent with casting defects found during IQC.",
    source: "FIELD" as const,
    status: "SUPPLIER_ASSIGNED" as const,
    severity: "MAJOR" as const,
    safetyImpact: false,
    vehicleDown: false,
    repeatIssue: true,
    vin: "WVWZZZ3CZWE445566",
    vehicleModel: "Model S 2025",
    mileage: 8000,
    failureDate: new Date("2026-04-28"),
    reportDate: new Date("2026-04-29"),
    location: "Berlin Service Center",
    partNumber: "AX-7420-B",
    partName: "Cylinder Head Casting",
    category: "Casting porosity",
    subcategory: "Surface defect",
    oemId: oemProCompany.id,
    supplierId: supplierCompany.id,
    supplierNameSnapshot: "Precision Parts Inc.",
    createdById: "oem-quality",
  };

  await prisma.fieldDefect.upsert({
    where: { id: linkageFd.id },
    update: { title: linkageFd.title, description: linkageFd.description, source: linkageFd.source, status: linkageFd.status, severity: linkageFd.severity, safetyImpact: linkageFd.safetyImpact, vehicleDown: linkageFd.vehicleDown, repeatIssue: linkageFd.repeatIssue, vin: linkageFd.vin, vehicleModel: linkageFd.vehicleModel, mileage: linkageFd.mileage, failureDate: linkageFd.failureDate, reportDate: linkageFd.reportDate, location: linkageFd.location, partNumber: linkageFd.partNumber, partName: linkageFd.partName, category: linkageFd.category, subcategory: linkageFd.subcategory, oemId: linkageFd.oemId, supplierId: linkageFd.supplierId, supplierNameSnapshot: linkageFd.supplierNameSnapshot, createdById: linkageFd.createdById },
    create: linkageFd,
  });

  // Scenario B: Supplier isolation — both suppliers have records for same part number
  // SteelForged (Supplier B) gets records for AX-7420-B to prove isolation
  const isolationPpap = {
    id: "ppap-isolation-b",
    requestNumber: "PPAP-SF-7420",
    partNumber: "AX-7420-B",
    partName: "Cylinder Head Casting (SteelForged Alt)",
    revision: "A",
    level: "LEVEL_3" as const,
    reasonForSubmission: "SUPPLIER_CHANGE" as const,
    status: "SUBMITTED" as const,
    oemId: oemProCompany.id,
    supplierId: supplierCompany2.id,
    oemOwnerId: "oem-quality",
    supplierAssigneeId: "steelforged-engineer",
    submittedAt: new Date("2026-04-20"),
    projectName: null,
    vehicleModel: null,
    revisionLevel: null,
    drawingNumber: null,
  };

  await prisma.ppapSubmission.upsert({
    where: { id: isolationPpap.id },
    update: { requestNumber: isolationPpap.requestNumber, partNumber: isolationPpap.partNumber, partName: isolationPpap.partName, level: isolationPpap.level, reasonForSubmission: isolationPpap.reasonForSubmission, status: isolationPpap.status, oemId: isolationPpap.oemId, supplierId: isolationPpap.supplierId, oemOwnerId: isolationPpap.oemOwnerId, supplierAssigneeId: isolationPpap.supplierAssigneeId, submittedAt: isolationPpap.submittedAt },
    create: isolationPpap as Parameters<typeof prisma.ppapSubmission.create>[0]["data"],
  });

  const isolationIqc = {
    id: "iqc-isolation-b",
    inspectionNumber: "IQC-SF-7420-001",
    partNumber: "AX-7420-B",
    partName: "Cylinder Head Casting (SteelForged Alt)",
    lotNumber: "LOT-SF-0099",
    quantityReceived: 25,
    inspectionQuantity: 5,
    status: "COMPLETED" as const,
    result: "ACCEPTED" as const,
    oemId: oemProCompany.id,
    supplierId: supplierCompany2.id,
    inspectorId: "oem-quality",
    inspectionDate: new Date("2026-04-22"),
    inspectionType: "FIRST_ARTICLE_INSPECTION" as const,
    createdById: "oem-quality",
    completedById: "oem-quality",
    quantityAccepted: 25,
    quantityRejected: 0,
    completedAt: new Date("2026-04-23"),
  };

  await prisma.iqcEvent.deleteMany({ where: { reportId: "iqc-isolation-b" } }).catch(() => {});
  await prisma.iqcChecklistItem.deleteMany({ where: { iqcInspectionId: "iqc-isolation-b" } }).catch(() => {});
  await prisma.iqcReport.deleteMany({ where: { id: "iqc-isolation-b" } }).catch(() => {});
  await prisma.iqcReport.create({ data: isolationIqc });

  const isolationFmea = {
    id: "fmea-isolation-b",
    fmeaNumber: "FMEA-SF-7420",
    title: "Cylinder Head Casting Process FMEA (SteelForged)",
    fmeaType: "PROCESS" as const,
    status: "DRAFT" as const,
    partNumber: "AX-7420-B",
    partName: "Cylinder Head Casting (SteelForged Alt)",
    processName: "Casting — Investment Casting",
    oemId: oemProCompany.id,
    supplierId: supplierCompany2.id,
    responsibleId: "steelforged-engineer",
    createdById: "oem-quality",
    dueDate: new Date("2026-07-01"),
    rows: [
      {
        id: "row_iso_1",
        processStep: "Shell building",
        failureMode: "Shell crack during dewax",
        failureEffect: "Dimensional distortion on casting",
        severity: 7,
        failureCause: "Thermal shock on ceramic shell",
        occurrence: 3,
        preventionControl: "Controlled dewax cycle",
        detectionControl: "Visual inspection post-dewax",
        detection: 4,
        rpn: 84,
        recommendedAction: "Add dewax cycle monitoring",
        actionOwner: "steelforged-engineer",
        actionStatus: "OPEN",
        targetDate: "2026-06-15",
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.fmea.upsert({
    where: { id: isolationFmea.id },
    update: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: isolationFmea as any,
  });

  const isolationDefect = {
    id: "defect-isolation-b",
    oemId: oemProCompany.id,
    supplierId: supplierCompany2.id,
    partNumber: "AX-7420-B",
    description: "Dimensional non-conformance on SteelForged cylinder head. Bolt hole pattern offset by 0.2mm from drawing specification.",
    status: "OPEN" as const,
    oemOwnerId: "oem-quality",
    supplierResponseDueAt: new Date("2026-05-20"),
  };

  await prisma.defect.upsert({
    where: { id: isolationDefect.id },
    update: { oemId: isolationDefect.oemId, supplierId: isolationDefect.supplierId, partNumber: isolationDefect.partNumber, description: isolationDefect.description, status: isolationDefect.status, oemOwnerId: isolationDefect.oemOwnerId ?? null, supplierResponseDueAt: isolationDefect.supplierResponseDueAt ?? null },
    create: isolationDefect,
  });

  // Scenario E: Weak false-positive — same supplier, different part, unrelated issue
  // defect-002 (BR-1122-C, Precision Parts) already serves this purpose.
  // Add a field defect for an unrelated part from the same supplier to test SAME_SUPPLIER_ONLY filtering
  const weakFd = {
    id: "fd-weak-e",
    title: "Wiper motor intermittent failure",
    description: "Intermittent wiper motor operation during cold starts below -10C. Motor stalls and recovers after 5 minutes of operation.",
    source: "SERVICE" as const,
    status: "OPEN" as const,
    severity: "MINOR" as const,
    safetyImpact: false,
    vehicleDown: false,
    repeatIssue: false,
    vehicleModel: "Model S 2025",
    partNumber: "WM-3300-A",
    partName: "Wiper Motor Assembly",
    oemId: oemProCompany.id,
    supplierId: supplierCompany.id,
    supplierNameSnapshot: "Precision Parts Inc.",
    createdById: "oem-quality",
    reportDate: new Date("2026-04-30"),
  };

  await prisma.fieldDefect.upsert({
    where: { id: weakFd.id },
    update: { title: weakFd.title, description: weakFd.description, source: weakFd.source, status: weakFd.status, severity: weakFd.severity, safetyImpact: weakFd.safetyImpact, vehicleDown: weakFd.vehicleDown, repeatIssue: weakFd.repeatIssue, vehicleModel: weakFd.vehicleModel, partNumber: weakFd.partNumber, partName: weakFd.partName, oemId: weakFd.oemId, supplierId: weakFd.supplierId, supplierNameSnapshot: weakFd.supplierNameSnapshot },
    create: weakFd,
  });

  // ── Quality Record Links (v2.5.2 demo data) ──────────────────────────

  const qualityRecordLinks = [
    {
      id: "qlink-manual-001",
      companyId: oemProCompany.id,
      sourceType: "FIELD_DEFECT" as const,
      sourceId: "fd-001",
      targetType: "DEFECT" as const,
      targetId: "defect-001",
      linkType: "MANUAL" as const,
      reason: "Same supplier brake part defect — manual cross-reference",
      createdById: "oem-quality",
    },
    {
      id: "qlink-part-001",
      companyId: oemProCompany.id,
      sourceType: "IQC" as const,
      sourceId: "iqc-001",
      targetType: "DEFECT" as const,
      targetId: "defect-001",
      linkType: "SAME_PART" as const,
      reason: "IQC rejection and defect share part AX-7420-B",
      createdById: "oem-quality",
    },
  ];

  for (const link of qualityRecordLinks) {
    await prisma.qualityRecordLink.upsert({
      where: { id: link.id },
      update: {},
      create: link,
    });
  }

  // ── v2.6.1 Enterprise OEM Intelligence Demo Data ────────────────────

  // Enterprise Scenario 1: APPROVED PPAP with later IQC rejection
  const entPpapApproved = {
    id: "ppap-ent-001",
    requestNumber: "PPAP-ENT-5500",
    partNumber: "ENG-5500-X",
    partName: "Transmission Output Shaft Bearing Assembly",
    revision: "B",
    level: "LEVEL_3" as const,
    reasonForSubmission: "NEW_PART" as const,
    status: "APPROVED" as const,
    oemId: oemEnterpriseCompany.id,
    supplierId: supplierCompany.id,
    oemOwnerId: "oem-enterprise-admin",
    approvedById: "oem-enterprise-admin",
    approvedAt: new Date("2026-03-15"),
    reviewedAt: new Date("2026-03-14"),
    submittedAt: new Date("2026-03-10"),
    projectName: "Flagship EV Platform",
    vehicleModel: "Flagship EV 2026",
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
  };

  await prisma.ppapSubmission.upsert({
    where: { id: entPpapApproved.id },
    update: {},
    create: entPpapApproved as Parameters<typeof prisma.ppapSubmission.create>[0]["data"],
  });

  // Enterprise IQC rejection for ENG-5500-X + Precision Parts
  const entIqcRejected = {
    id: "iqc-ent-001",
    inspectionNumber: "IQC-ENT-5500-001",
    partNumber: "ENG-5500-X",
    partName: "Transmission Output Shaft Bearing Assembly",
    lotNumber: "LOT-ENT-5500-001",
    quantityReceived: 100,
    inspectionQuantity: 15,
    status: "COMPLETED" as const,
    result: "REJECTED" as const,
    oemId: oemEnterpriseCompany.id,
    supplierId: supplierCompany.id,
    inspectorId: "oem-enterprise-admin",
    inspectionDate: new Date("2026-04-05"),
    inspectionType: "RECEIVING_INSPECTION" as const,
    createdById: "oem-enterprise-admin",
    completedById: "oem-enterprise-admin",
    quantityAccepted: 88,
    quantityRejected: 12,
    dispositionNotes: "12 bearing assemblies failed fatigue pre-screening. Inner race surface cracking observed.",
    completedAt: new Date("2026-04-06"),
  };

  await prisma.iqcEvent.deleteMany({ where: { reportId: "iqc-ent-001" } }).catch(() => {});
  await prisma.iqcChecklistItem.deleteMany({ where: { iqcInspectionId: "iqc-ent-001" } }).catch(() => {});
  await prisma.iqcReport.deleteMany({ where: { id: "iqc-ent-001" } }).catch(() => {});
  await prisma.iqcReport.create({ data: entIqcRejected });

  // Enterprise IQC ON_HOLD for ENG-7700-Y + SteelForged
  const entIqcOnHold = {
    id: "iqc-ent-002",
    inspectionNumber: "IQC-ENT-7700-001",
    partNumber: "ENG-7700-Y",
    partName: "Front Lower Control Arm",
    lotNumber: "LOT-ENT-7700-001",
    quantityReceived: 50,
    inspectionQuantity: 8,
    status: "COMPLETED" as const,
    result: "ON_HOLD" as const,
    oemId: oemEnterpriseCompany.id,
    supplierId: supplierCompany2.id,
    inspectorId: "oem-enterprise-admin",
    inspectionDate: new Date("2026-04-18"),
    inspectionType: "RECEIVING_INSPECTION" as const,
    createdById: "oem-enterprise-admin",
    completedById: "oem-enterprise-admin",
    quantityAccepted: 44,
    quantityRejected: 6,
    dispositionNotes: "Corrosion pitting observed on 6 units. Lot placed on hold pending supplier root cause.",
    completedAt: new Date("2026-04-19"),
  };

  await prisma.iqcEvent.deleteMany({ where: { reportId: "iqc-ent-002" } }).catch(() => {});
  await prisma.iqcChecklistItem.deleteMany({ where: { iqcInspectionId: "iqc-ent-002" } }).catch(() => {});
  await prisma.iqcReport.deleteMany({ where: { id: "iqc-ent-002" } }).catch(() => {});
  await prisma.iqcReport.create({ data: entIqcOnHold });

  // Enterprise FMEA with high RPN for ENG-5500-X
  const entFmea = {
    id: "fmea-ent-001",
    fmeaNumber: "FMEA-ENT-5500",
    title: "Transmission Output Shaft Bearing Process FMEA",
    fmeaType: "PROCESS" as const,
    status: "SUPPLIER_IN_PROGRESS" as const,
    partNumber: "ENG-5500-X",
    partName: "Transmission Output Shaft Bearing Assembly",
    processName: "Heat treatment — Case hardening",
    oemId: oemEnterpriseCompany.id,
    supplierId: supplierCompany.id,
    responsibleId: "supplier-engineer",
    createdById: "oem-enterprise-admin",
    dueDate: new Date("2026-07-15"),
    rows: [
      {
        id: "row_ent_1",
        processStep: "Case hardening furnace",
        failureMode: "Insufficient case depth causing fatigue failure",
        failureEffect: "Bearing inner race catastrophic fracture",
        severity: 10,
        failureCause: "Furnace temperature deviation beyond tolerance",
        occurrence: 4,
        preventionControl: "Furnace temperature monitoring system",
        detectionControl: "Case depth measurement per lot",
        detection: 5,
        rpn: 200,
        recommendedAction: "Install redundant thermocouple in furnace Zone 3",
        actionOwner: "supplier-engineer",
        actionStatus: "OPEN",
        targetDate: "2026-06-30",
      },
      {
        id: "row_ent_2",
        processStep: "Grinding — inner race",
        failureMode: "Surface pitting on bearing race",
        failureEffect: "Premature bearing noise and vibration",
        severity: 7,
        failureCause: "Grinding wheel dressing interval exceeded",
        occurrence: 3,
        preventionControl: "Scheduled grinding wheel replacement",
        detectionControl: "Surface finish metrology",
        detection: 4,
        rpn: 84,
        recommendedAction: "Reduce grinding wheel replacement interval by 50%",
        actionOwner: "oem-enterprise-admin",
        actionStatus: "IN_PROGRESS",
        targetDate: "2026-07-01",
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.fmea.upsert({
    where: { id: entFmea.id },
    update: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: entFmea as any,
  });

  // Update Enterprise field defects with categories for FMEA coverage gap signals
  await prisma.fieldDefect.update({
    where: { id: "fd-ent-001" },
    data: {
      category: "Bearing failure",
      subcategory: "Fatigue cracking",
    },
  });

  await prisma.fieldDefect.update({
    where: { id: "fd-ent-002" },
    data: {
      category: "Corrosion",
      subcategory: "Pitting corrosion",
    },
  });

  // ── v2.6.0 Intelligence Demo Data ────────────────────────────────────

  // Intelligence scenario 1: Approved PPAP with later IQC rejection
  // ppap-003 is APPROVED for CS-3344-D from SteelForged — add IQC rejection
  const intelIqcRejected = {
    id: "iqc-intel-001",
    inspectionNumber: "IQC-INTEL-CS001",
    partNumber: "CS-3344-D",
    partName: "Steering Knuckle Forging",
    lotNumber: "LOT-INTEL-001",
    quantityReceived: 40,
    inspectionQuantity: 8,
    status: "COMPLETED" as const,
    result: "REJECTED" as const,
    oemId: oemProCompany.id,
    supplierId: supplierCompany2.id,
    inspectorId: "oem-quality",
    inspectionDate: new Date("2026-03-10"),
    inspectionType: "RE_INSPECTION" as const,
    createdById: "oem-quality",
    completedById: "oem-quality",
    quantityAccepted: 32,
    quantityRejected: 8,
    dispositionNotes: "Casting crack detected on 8 units during re-inspection. Ultrasonic testing failure.",
    completedAt: new Date("2026-03-12"),
  };

  await prisma.iqcEvent.deleteMany({ where: { reportId: "iqc-intel-001" } }).catch(() => {});
  await prisma.iqcChecklistItem.deleteMany({ where: { iqcInspectionId: "iqc-intel-001" } }).catch(() => {});
  await prisma.iqcReport.deleteMany({ where: { id: "iqc-intel-001" } }).catch(() => {});
  await prisma.iqcReport.create({ data: intelIqcRejected });

  // Intelligence scenario 2: FMEA coverage gap — field defect with category but no matching FMEA
  const intelFieldDefect = {
    id: "fd-intel-gap",
    title: "Power steering module intermittent fault",
    description: "Electronic power steering module intermittent failure during cold starts. Warning light illuminates for 2-3 seconds before self-recovery. Multiple field reports across vehicle fleet.",
    source: "FIELD" as const,
    status: "OPEN" as const,
    severity: "MAJOR" as const,
    safetyImpact: true,
    vehicleDown: false,
    repeatIssue: true,
    vehicleModel: "Model X 2025",
    partNumber: "PS-2233-B",
    partName: "Electronic Power Steering Module",
    category: "Electronic failure",
    subcategory: "Intermittent circuit fault",
    oemId: oemProCompany.id,
    supplierId: supplierCompany.id,
    supplierNameSnapshot: "Precision Parts Inc.",
    createdById: "oem-quality",
    reportDate: new Date("2026-04-28"),
  };

  // Check if FMEA exists for PS-2233-B + Precision Parts — it doesn't in seed data
  await prisma.fieldDefect.upsert({
    where: { id: intelFieldDefect.id },
    update: { title: intelFieldDefect.title, description: intelFieldDefect.description, source: intelFieldDefect.source, status: intelFieldDefect.status, severity: intelFieldDefect.severity, safetyImpact: intelFieldDefect.safetyImpact, vehicleDown: intelFieldDefect.vehicleDown, repeatIssue: intelFieldDefect.repeatIssue, vehicleModel: intelFieldDefect.vehicleModel, partNumber: intelFieldDefect.partNumber, partName: intelFieldDefect.partName, category: intelFieldDefect.category, subcategory: intelFieldDefect.subcategory, oemId: intelFieldDefect.oemId, supplierId: intelFieldDefect.supplierId, supplierNameSnapshot: intelFieldDefect.supplierNameSnapshot, createdById: intelFieldDefect.createdById },
    create: intelFieldDefect,
  });

  // Intelligence scenario 3: Second IQC rejection for AX-7420-B to make repeat pattern stronger
  const intelIqcSecond = {
    id: "iqc-intel-002",
    inspectionNumber: "IQC-INTEL-AX002",
    partNumber: "AX-7420-B",
    partName: "Cylinder Head Casting",
    lotNumber: "LOT-INTEL-AX002",
    quantityReceived: 60,
    inspectionQuantity: 12,
    status: "COMPLETED" as const,
    result: "ON_HOLD" as const,
    oemId: oemProCompany.id,
    supplierId: supplierCompany.id,
    inspectorId: "oem-quality",
    inspectionDate: new Date("2026-04-25"),
    inspectionType: "RE_INSPECTION" as const,
    createdById: "oem-quality",
    completedById: "oem-quality",
    quantityAccepted: 55,
    quantityRejected: 5,
    dispositionNotes: "Surface pitting on sealing surface. Lot placed on hold pending supplier response.",
    completedAt: new Date("2026-04-26"),
  };

  await prisma.iqcEvent.deleteMany({ where: { reportId: "iqc-intel-002" } }).catch(() => {});
  await prisma.iqcChecklistItem.deleteMany({ where: { iqcInspectionId: "iqc-intel-002" } }).catch(() => {});
  await prisma.iqcReport.deleteMany({ where: { id: "iqc-intel-002" } }).catch(() => {});
  await prisma.iqcReport.create({ data: intelIqcSecond });

  // ── v2.9.2 Demo Data Polish ────────────────────────────────────────

  // Clean up existing v2.9.2 data before re-seeding
  await prisma.notification.deleteMany({ where: { id: { in: ["notif-001", "notif-002", "notif-003", "notif-004", "notif-005", "notif-006", "notif-007", "notif-008", "notif-009", "notif-010", "notif-011"] } } }).catch(() => {});
  await prisma.defectEvent.deleteMany({ where: { id: { in: ["de-001-1", "de-002-1", "de-002-2", "de-003-1", "de-004-1", "de-004-2", "de-free1-1", "de-free2-1", "de-free2-2", "de-ent1-1", "de-ent2-1", "de-ent2-2", "de-isob-1"] } } }).catch(() => {});
  await prisma.fmeaEvent.deleteMany({ where: { id: { in: ["fmea-evt-isob-1", "fmea-evt-ent1-1", "fmea-evt-ent1-2"] } } }).catch(() => {});
  await prisma.ppapEvent.deleteMany({ where: { id: { in: ["ppevt-isob-1", "ppevt-isob-2", "ppevt-ent1-1", "ppevt-ent1-2", "ppevt-ent1-3"] } } }).catch(() => {});
  await prisma.ppapEvidence.deleteMany({ where: { id: { in: ["ppe-isob-01", "ppe-isob-02", "ppe-isob-03", "ppe-isob-04", "ppe-isob-05", "ppe-isob-06", "ppe-ent1-01", "ppe-ent1-02", "ppe-ent1-03", "ppe-ent1-04", "ppe-ent1-05", "ppe-ent1-06", "ppe-ent1-07", "ppe-ent1-08"] } } }).catch(() => {});
  await prisma.iqcEvent.deleteMany({ where: { id: { in: ["iqc-evt-isob-c", "iqc-evt-isob-d", "iqc-evt-ent1-c", "iqc-evt-ent1-f", "iqc-evt-ent2-c", "iqc-evt-ent2-d", "iqc-evt-int1-c", "iqc-evt-int1-f", "iqc-evt-int2-c", "iqc-evt-int2-d"] } } }).catch(() => {});
  await prisma.iqcChecklistItem.deleteMany({ where: { id: { in: ["iqc-cli-isob-01", "iqc-cli-isob-02", "iqc-cli-isob-03", "iqc-cli-isob-04", "iqc-cli-isob-05", "iqc-cli-isob-06", "iqc-cli-ent1-01", "iqc-cli-ent1-02", "iqc-cli-ent1-03", "iqc-cli-ent1-04", "iqc-cli-ent1-05", "iqc-cli-ent1-06", "iqc-cli-ent1-07", "iqc-cli-ent1-08", "iqc-cli-ent1-09", "iqc-cli-ent2-01", "iqc-cli-ent2-02", "iqc-cli-ent2-03", "iqc-cli-ent2-04", "iqc-cli-ent2-05", "iqc-cli-ent2-06", "iqc-cli-intel1-01", "iqc-cli-intel1-02", "iqc-cli-intel1-03", "iqc-cli-intel1-04", "iqc-cli-intel1-05", "iqc-cli-intel2-01", "iqc-cli-intel2-02", "iqc-cli-intel2-03", "iqc-cli-intel2-04", "iqc-cli-intel2-05"] } } }).catch(() => {});

  // Enterprise QE user (added above in users array)

  // IQC Checklist Items for v2.6.1/v2.8.2/v2.9.0 IQC reports that had none
  await prisma.iqcChecklistItem.createMany({
    data: [
      // iqc-isolation-b (COMPLETED/ACCEPTED) — all OK
      { id: "iqc-cli-isob-01", iqcInspectionId: "iqc-isolation-b", itemName: "Packaging Condition", requirement: "No visible damage on packaging", result: "OK" as const },
      { id: "iqc-cli-isob-02", iqcInspectionId: "iqc-isolation-b", itemName: "Label / Traceability Check", requirement: "Labels match PO and part number", result: "OK" as const },
      { id: "iqc-cli-isob-03", iqcInspectionId: "iqc-isolation-b", itemName: "Visual Inspection", requirement: "No visible defects or surface irregularities", result: "OK" as const },
      { id: "iqc-cli-isob-04", iqcInspectionId: "iqc-isolation-b", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances", result: "OK" as const },
      { id: "iqc-cli-isob-05", iqcInspectionId: "iqc-isolation-b", itemName: "Material Certificate Check", requirement: "Material certification matches specification", result: "OK" as const },
      { id: "iqc-cli-isob-06", iqcInspectionId: "iqc-isolation-b", itemName: "Quantity Check", requirement: "Received quantity matches PO", result: "OK" as const },

      // iqc-ent-001 (COMPLETED/REJECTED) — some NOK
      { id: "iqc-cli-ent1-01", iqcInspectionId: "iqc-ent-001", itemName: "Packaging Condition", requirement: "No visible damage on packaging", result: "OK" as const },
      { id: "iqc-cli-ent1-02", iqcInspectionId: "iqc-ent-001", itemName: "Label / Traceability Check", requirement: "Labels match PO and part number", result: "OK" as const },
      { id: "iqc-cli-ent1-03", iqcInspectionId: "iqc-ent-001", itemName: "Visual Inspection", requirement: "No visible defects or surface irregularities", result: "NOK" as const, comment: "Surface cracking observed on 12 units" },
      { id: "iqc-cli-ent1-04", iqcInspectionId: "iqc-ent-001", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances", result: "OK" as const },
      { id: "iqc-cli-ent1-05", iqcInspectionId: "iqc-ent-001", itemName: "Functional Check", requirement: "Part functions as intended per specification", result: "NOK" as const, comment: "Fatigue pre-screening failure on 12 of 15 samples" },
      { id: "iqc-cli-ent1-06", iqcInspectionId: "iqc-ent-001", itemName: "Material Certificate Check", requirement: "Material certification matches specification", result: "OK" as const },
      { id: "iqc-cli-ent1-07", iqcInspectionId: "iqc-ent-001", itemName: "Special Characteristic Check", requirement: "Safety critical characteristics verified", result: "NOK" as const, comment: "Inner race surface cracking exceeds limit" },
      { id: "iqc-cli-ent1-08", iqcInspectionId: "iqc-ent-001", itemName: "Quantity Check", requirement: "Received quantity matches PO", result: "OK" as const },
      { id: "iqc-cli-ent1-09", iqcInspectionId: "iqc-ent-001", itemName: "Damage Check", requirement: "No shipping damage or impact marks", result: "OK" as const },

      // iqc-ent-002 (COMPLETED/ON_HOLD) — some NOK
      { id: "iqc-cli-ent2-01", iqcInspectionId: "iqc-ent-002", itemName: "Packaging Condition", requirement: "No visible damage on packaging", result: "OK" as const },
      { id: "iqc-cli-ent2-02", iqcInspectionId: "iqc-ent-002", itemName: "Visual Inspection", requirement: "No visible defects or surface irregularities", result: "NOK" as const, comment: "Corrosion pitting on 6 units" },
      { id: "iqc-cli-ent2-03", iqcInspectionId: "iqc-ent-002", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances", result: "OK" as const },
      { id: "iqc-cli-ent2-04", iqcInspectionId: "iqc-ent-002", itemName: "Material Certificate Check", requirement: "Material certification matches specification", result: "NA" as const },
      { id: "iqc-cli-ent2-05", iqcInspectionId: "iqc-ent-002", itemName: "Quantity Check", requirement: "Received quantity matches PO", result: "OK" as const },
      { id: "iqc-cli-ent2-06", iqcInspectionId: "iqc-ent-002", itemName: "Special Characteristic Check", requirement: "Safety critical characteristics verified", result: "NOK" as const, comment: "Corrosion pitting on control arm ball joint surface" },

      // iqc-intel-001 (COMPLETED/REJECTED) — ultrasonic failure
      { id: "iqc-cli-intel1-01", iqcInspectionId: "iqc-intel-001", itemName: "Ultrasonic Testing", requirement: "No internal cracks detected via ultrasonic testing", result: "NOK" as const, comment: "Casting crack detected on 8 units during ultrasonic testing" },
      { id: "iqc-cli-intel1-02", iqcInspectionId: "iqc-intel-001", itemName: "Visual Inspection", requirement: "No visible surface defects", result: "OK" as const },
      { id: "iqc-cli-intel1-03", iqcInspectionId: "iqc-intel-001", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances", result: "OK" as const },
      { id: "iqc-cli-intel1-04", iqcInspectionId: "iqc-intel-001", itemName: "Material Certificate Check", requirement: "Material certification matches specification", result: "OK" as const },
      { id: "iqc-cli-intel1-05", iqcInspectionId: "iqc-intel-001", itemName: "Quantity Check", requirement: "Received quantity matches PO", result: "OK" as const },

      // iqc-intel-002 (COMPLETED/ON_HOLD) — surface pitting
      { id: "iqc-cli-intel2-01", iqcInspectionId: "iqc-intel-002", itemName: "Visual Inspection", requirement: "No visible surface defects or pitting", result: "NOK" as const, comment: "Surface pitting on sealing surface of 5 units" },
      { id: "iqc-cli-intel2-02", iqcInspectionId: "iqc-intel-002", itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances", result: "OK" as const },
      { id: "iqc-cli-intel2-03", iqcInspectionId: "iqc-intel-002", itemName: "Material Certificate Check", requirement: "Material certification matches specification", result: "OK" as const },
      { id: "iqc-cli-intel2-04", iqcInspectionId: "iqc-intel-002", itemName: "Quantity Check", requirement: "Received quantity matches PO", result: "OK" as const },
      { id: "iqc-cli-intel2-05", iqcInspectionId: "iqc-intel-002", itemName: "Special Characteristic Check", requirement: "Safety critical characteristics verified", result: "PENDING" as const },
    ],
  });

  // IQC Events for IQC reports that had none
  await prisma.iqcEvent.createMany({
    data: [
      { id: "iqc-evt-isob-c", reportId: "iqc-isolation-b", type: "IQC_CREATED" as const, actorId: "oem-quality", createdAt: new Date("2026-04-22T09:00:00Z") },
      { id: "iqc-evt-isob-d", reportId: "iqc-isolation-b", type: "IQC_COMPLETED" as const, actorId: "oem-quality", createdAt: new Date("2026-04-23T14:00:00Z") },
      { id: "iqc-evt-ent1-c", reportId: "iqc-ent-001", type: "IQC_CREATED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-04-05T08:00:00Z") },
      { id: "iqc-evt-ent1-f", reportId: "iqc-ent-001", type: "IQC_FAILED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-04-06T16:00:00Z") },
      { id: "iqc-evt-ent2-c", reportId: "iqc-ent-002", type: "IQC_CREATED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-04-18T09:00:00Z") },
      { id: "iqc-evt-ent2-d", reportId: "iqc-ent-002", type: "IQC_COMPLETED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-04-19T11:00:00Z") },
      { id: "iqc-evt-int1-c", reportId: "iqc-intel-001", type: "IQC_CREATED" as const, actorId: "oem-quality", createdAt: new Date("2026-03-10T08:00:00Z") },
      { id: "iqc-evt-int1-f", reportId: "iqc-intel-001", type: "IQC_FAILED" as const, actorId: "oem-quality", createdAt: new Date("2026-03-12T14:00:00Z") },
      { id: "iqc-evt-int2-c", reportId: "iqc-intel-002", type: "IQC_CREATED" as const, actorId: "oem-quality", createdAt: new Date("2026-04-25T08:00:00Z") },
      { id: "iqc-evt-int2-d", reportId: "iqc-intel-002", type: "IQC_COMPLETED" as const, actorId: "oem-quality", createdAt: new Date("2026-04-26T15:00:00Z") },
    ],
  });

  // PPAP Evidence for ppap-isolation-b (SUBMITTED) and ppap-ent-001 (APPROVED)
  await prisma.ppapEvidence.createMany({
    data: [
      // ppap-isolation-b (SUBMITTED) — mixed status
      { id: "ppe-isob-01", ppapId: "ppap-isolation-b", requirement: "DESIGN_RECORDS" as const, status: "UPLOADED" as const, companyId: oemProCompany.id, uploadedById: "steelforged-engineer", fileName: "design_records_sf.pdf", mimeType: "application/pdf", sizeBytes: 245000 },
      { id: "ppe-isob-02", ppapId: "ppap-isolation-b", requirement: "PROCESS_FMEA" as const, status: "UPLOADED" as const, companyId: oemProCompany.id, uploadedById: "steelforged-engineer", fileName: "pfmea_sf.pdf", mimeType: "application/pdf", sizeBytes: 189000 },
      { id: "ppe-isob-03", ppapId: "ppap-isolation-b", requirement: "CONTROL_PLAN" as const, status: "UPLOADED" as const, companyId: oemProCompany.id, uploadedById: "steelforged-engineer", fileName: "control_plan_sf.pdf", mimeType: "application/pdf", sizeBytes: 156000 },
      { id: "ppe-isob-04", ppapId: "ppap-isolation-b", requirement: "DIMENSIONAL_RESULTS" as const, status: "MISSING" as const, companyId: oemProCompany.id },
      { id: "ppe-isob-05", ppapId: "ppap-isolation-b", requirement: "MATERIAL_PERFORMANCE_RESULTS" as const, status: "MISSING" as const, companyId: oemProCompany.id },
      { id: "ppe-isob-06", ppapId: "ppap-isolation-b", requirement: "PART_SUBMISSION_WARRANT" as const, status: "UPLOADED" as const, companyId: oemProCompany.id, uploadedById: "steelforged-admin", fileName: "psw_sf.pdf", mimeType: "application/pdf", sizeBytes: 98000 },

      // ppap-ent-001 (APPROVED) — all evidence APPROVED
      { id: "ppe-ent1-01", ppapId: "ppap-ent-001", requirement: "DESIGN_RECORDS" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-13"), fileName: "design_records_ent.pdf", mimeType: "application/pdf", sizeBytes: 312000 },
      { id: "ppe-ent1-02", ppapId: "ppap-ent-001", requirement: "PROCESS_FLOW_DIAGRAM" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-13"), fileName: "process_flow_ent.pdf", mimeType: "application/pdf", sizeBytes: 145000 },
      { id: "ppe-ent1-03", ppapId: "ppap-ent-001", requirement: "PROCESS_FMEA" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-13"), fileName: "pfmea_ent.pdf", mimeType: "application/pdf", sizeBytes: 267000 },
      { id: "ppe-ent1-04", ppapId: "ppap-ent-001", requirement: "CONTROL_PLAN" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-13"), fileName: "control_plan_ent.pdf", mimeType: "application/pdf", sizeBytes: 178000 },
      { id: "ppe-ent1-05", ppapId: "ppap-ent-001", requirement: "MEASUREMENT_SYSTEM_ANALYSIS" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-14"), fileName: "msa_ent.pdf", mimeType: "application/pdf", sizeBytes: 134000 },
      { id: "ppe-ent1-06", ppapId: "ppap-ent-001", requirement: "DIMENSIONAL_RESULTS" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-14"), fileName: "dim_results_ent.pdf", mimeType: "application/pdf", sizeBytes: 289000 },
      { id: "ppe-ent1-07", ppapId: "ppap-ent-001", requirement: "MATERIAL_PERFORMANCE_RESULTS" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-engineer", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-14"), fileName: "material_results_ent.pdf", mimeType: "application/pdf", sizeBytes: 201000 },
      { id: "ppe-ent1-08", ppapId: "ppap-ent-001", requirement: "PART_SUBMISSION_WARRANT" as const, status: "APPROVED" as const, companyId: oemEnterpriseCompany.id, uploadedById: "supplier-admin", reviewedById: "oem-enterprise-admin", reviewedAt: new Date("2026-03-15"), fileName: "psw_ent.pdf", mimeType: "application/pdf", sizeBytes: 87000 },
    ],
  });

  // PPAP Events for ppap-isolation-b and ppap-ent-001
  await prisma.ppapEvent.createMany({
    data: [
      { id: "ppevt-isob-1", ppapId: "ppap-isolation-b", type: "PPAP_CREATED" as const, actorId: "oem-quality", createdAt: new Date("2026-04-18T10:00:00Z") },
      { id: "ppevt-isob-2", ppapId: "ppap-isolation-b", type: "PPAP_SUBMITTED" as const, actorId: "steelforged-engineer", createdAt: new Date("2026-04-20T14:00:00Z") },

      { id: "ppevt-ent1-1", ppapId: "ppap-ent-001", type: "PPAP_CREATED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-03-08T09:00:00Z") },
      { id: "ppevt-ent1-2", ppapId: "ppap-ent-001", type: "PPAP_SUBMITTED" as const, actorId: "supplier-engineer", createdAt: new Date("2026-03-10T11:00:00Z") },
      { id: "ppevt-ent1-3", ppapId: "ppap-ent-001", type: "PPAP_APPROVED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-03-15T16:00:00Z") },
    ],
  });

  // FMEA Events for fmea-isolation-b and fmea-ent-001
  await prisma.fmeaEvent.createMany({
    data: [
      { id: "fmea-evt-isob-1", fmeaId: "fmea-isolation-b", type: "FMEA_CREATED" as const, actorId: "oem-quality", createdAt: new Date("2026-04-20T10:00:00Z") },
      { id: "fmea-evt-ent1-1", fmeaId: "fmea-ent-001", type: "FMEA_CREATED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-04-10T09:00:00Z") },
      { id: "fmea-evt-ent1-2", fmeaId: "fmea-ent-001", type: "FMEA_SUBMITTED" as const, actorId: "oem-enterprise-admin", createdAt: new Date("2026-04-15T14:00:00Z") },
    ],
  });

  // Defect Events for all seeded defects
  await prisma.defectEvent.createMany({
    data: [
      // defect-001 (OPEN)
      { id: "de-001-1", defectId: "defect-001", type: "CREATED" as const, actorId: "oem-quality", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-01T09:00:00Z") },
      // defect-002 (IN_PROGRESS)
      { id: "de-002-1", defectId: "defect-002", type: "CREATED" as const, actorId: "oem-quality", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-05T10:00:00Z") },
      { id: "de-002-2", defectId: "defect-002", type: "EIGHT_D_STARTED" as const, actorId: "oem-quality", metadata: { status: "IN_PROGRESS" }, createdAt: new Date("2026-04-08T14:00:00Z") },
      // defect-003 (OPEN, LEVEL_1 escalation)
      { id: "de-003-1", defectId: "defect-003", type: "CREATED" as const, actorId: "oem-quality", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-12T08:00:00Z") },
      // defect-004 (RESOLVED)
      { id: "de-004-1", defectId: "defect-004", type: "CREATED" as const, actorId: "oem-quality", metadata: { status: "OPEN" }, createdAt: new Date("2026-03-15T09:00:00Z") },
      { id: "de-004-2", defectId: "defect-004", type: "APPROVED" as const, actorId: "oem-admin", metadata: { status: "RESOLVED" }, createdAt: new Date("2026-04-01T16:00:00Z") },
      // defect-free-001 (OPEN)
      { id: "de-free1-1", defectId: "defect-free-001", type: "CREATED" as const, actorId: "oem-free-admin", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-20T10:00:00Z") },
      // defect-free-002 (IN_PROGRESS)
      { id: "de-free2-1", defectId: "defect-free-002", type: "CREATED" as const, actorId: "oem-free-admin", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-22T08:00:00Z") },
      { id: "de-free2-2", defectId: "defect-free-002", type: "EIGHT_D_STARTED" as const, actorId: "oem-free-admin", metadata: { status: "IN_PROGRESS" }, createdAt: new Date("2026-04-24T14:00:00Z") },
      // defect-ent-001 (OPEN, LEVEL_2 escalation)
      { id: "de-ent1-1", defectId: "defect-ent-001", type: "CREATED" as const, actorId: "oem-enterprise-admin", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-02T08:00:00Z") },
      // defect-ent-002 (IN_PROGRESS)
      { id: "de-ent2-1", defectId: "defect-ent-002", type: "CREATED" as const, actorId: "oem-enterprise-admin", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-10T09:00:00Z") },
      { id: "de-ent2-2", defectId: "defect-ent-002", type: "EIGHT_D_STARTED" as const, actorId: "oem-enterprise-admin", metadata: { status: "IN_PROGRESS" }, createdAt: new Date("2026-04-12T11:00:00Z") },
      // defect-isolation-b (OPEN)
      { id: "de-isob-1", defectId: "defect-isolation-b", type: "CREATED" as const, actorId: "oem-quality", metadata: { status: "OPEN" }, createdAt: new Date("2026-04-25T10:00:00Z") },
    ],
  });

  // Notifications for demo realism
  await prisma.notification.createMany({
    data: [
      // PRO OEM notifications
      { id: "notif-001", userId: "oem-pro-admin", companyId: oemProCompany.id, type: "NEW_DEFECT" as const, title: "New Defect Reported", message: "Surface porosity on cylinder head AX-7420-B reported by Precision Parts.", entityType: "DEFECT", entityId: "defect-001", link: "/quality/oem/defects/defect-001", isRead: false, createdAt: new Date("2026-05-01T09:00:00Z") },
      { id: "notif-002", userId: "oem-pro-admin", companyId: oemProCompany.id, type: "IQC_FAILED" as const, title: "IQC Rejected", message: "IQC-2026-0001 for AX-7420-B has been rejected. 5 units failed inspection.", entityType: "IQC", entityId: "iqc-001", link: "/quality/oem/iqc/iqc-001", isRead: false, createdAt: new Date("2026-05-01T10:30:00Z") },
      { id: "notif-003", userId: "oem-pro-qe", companyId: oemProCompany.id, type: "PPAP_SUBMITTED" as const, title: "PPAP Submitted", message: "SteelForged has submitted PPAP-SF-7420 for AX-7420-B Cylinder Head Casting.", entityType: "PPAP", entityId: "ppap-isolation-b", link: "/quality/oem/ppap/ppap-isolation-b", isRead: false, createdAt: new Date("2026-04-20T14:00:00Z") },
      { id: "notif-004", userId: "oem-quality", companyId: oemProCompany.id, type: "FIELD_DEFECT_CREATED" as const, title: "Field Defect Reported", message: "Critical field defect: Intermittent power steering failure on BR-1122-C.", entityType: "FIELD_DEFECT", entityId: "fd-002", link: "/quality/oem/field/fd-002", isRead: true, createdAt: new Date("2026-04-28T11:00:00Z") },
      { id: "notif-005", userId: "oem-quality", companyId: oemProCompany.id, type: "PPAP_APPROVED" as const, title: "PPAP Approved", message: "PPAP-QJ8R5N for CS-3344-D (SteelForged) has been approved.", entityType: "PPAP", entityId: "ppap-003", link: "/quality/oem/ppap/ppap-003", isRead: true, createdAt: new Date("2026-04-15T16:00:00Z") },

      // ENTERPRISE OEM notifications
      { id: "notif-006", userId: "oem-enterprise-admin", companyId: oemEnterpriseCompany.id, type: "NEW_DEFECT" as const, title: "Critical Defect Reported", message: "Catastrophic bearing failure on ENG-5500-X. Level 2 escalation triggered.", entityType: "DEFECT", entityId: "defect-ent-001", link: "/quality/oem/defects/defect-ent-001", isRead: false, createdAt: new Date("2026-05-02T08:00:00Z") },
      { id: "notif-007", userId: "oem-enterprise-admin", companyId: oemEnterpriseCompany.id, type: "SLA_DUE_SOON" as const, title: "SLA Due Soon", message: "Development plan 'Quality Improvement — AX-7420-B Bearing Failure' is due in 30 days.", entityType: "DEV_PLAN", entityId: "dev-plan-001", link: "/quality/oem/supplier-development/dev-plan-001", isRead: false, createdAt: new Date("2026-05-08T09:00:00Z") },
      { id: "notif-008", userId: "oem-enterprise-qe", companyId: oemEnterpriseCompany.id, type: "IQC_FAILED" as const, title: "IQC Rejected", message: "IQC-ENT-5500-001 for ENG-5500-X has been rejected. 12 units failed.", entityType: "IQC", entityId: "iqc-ent-001", link: "/quality/oem/iqc/iqc-ent-001", isRead: false, createdAt: new Date("2026-04-06T16:00:00Z") },
      { id: "notif-009", userId: "oem-enterprise-qe", companyId: oemEnterpriseCompany.id, type: "FMEA_STATUS_CHANGED" as const, title: "FMEA Status Update", message: "FMEA-ENT-5500 for ENG-5500-X has been submitted for review.", entityType: "FMEA", entityId: "fmea-ent-001", link: "/quality/oem/fmea/fmea-ent-001", isRead: true, createdAt: new Date("2026-04-15T14:00:00Z") },

      // SUPPLIER A notifications
      { id: "notif-010", userId: "supplier-admin", companyId: supplierCompany.id, type: "DEV_PLAN_ACTION_REQUIRED" as const, title: "Action Required", message: "Development plan 'Quality Improvement — AX-7420-B Bearing Failure' requires your action.", entityType: "DEV_PLAN", entityId: "dev-plan-001", link: "/quality/supplier/development/dev-plan-001", isRead: false, createdAt: new Date("2026-05-03T10:00:00Z") },
      { id: "notif-011", userId: "supplier-engineer", companyId: supplierCompany.id, type: "FIELD_DEFECT_ASSIGNED" as const, title: "Field Defect Assigned", message: "Brake pedal vibration on AX-7420-B has been assigned to Precision Parts.", entityType: "FIELD_DEFECT", entityId: "fd-001", link: "/quality/supplier/field/fd-001", isRead: false, createdAt: new Date("2026-04-28T11:00:00Z") },
    ],
  });

  // ── Summary ────────────────────────────────────────────────────────

  console.log("v2.9.2 Seed completed successfully!");
  console.log("");
  console.log("=== Test Accounts (Dev Credentials — LOCAL/DEV ONLY) ===");
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
  console.log("  qe-enterprise@oem.com — Enterprise Motors Group (ENTERPRISE plan, OEM QE)");
  console.log("");
  console.log("SUPPLIER A (Precision Parts):");
  console.log("  admin@supplier.com    — Precision Parts Inc. (FREE, Supplier Admin)");
  console.log("  engineer@supplier.com — Precision Parts Inc. (FREE, Supplier QE)");
  console.log("");
  console.log("SUPPLIER B (SteelForged):");
  console.log("  admin@steelforged.com — SteelForged Co. (FREE, Supplier Admin)");
  console.log("  engineer@steelforged.com — SteelForged Co. (FREE, Supplier QE)");
  console.log("");
  console.log("=== Quality Linkage Demo Scenarios ===");
  console.log("");
  console.log("Scenario A (Strong linkage): View fd-linkage-a — same supplier + part as PPAP/IQC/FMEA/Defect");
  console.log("Scenario B (Supplier isolation): AX-7420-B exists for both suppliers — verify A never sees B records");
  console.log("Scenario C (FMEA coverage): fmea-001 row has 'Surface porosity' — fd-linkage-a category 'Casting porosity' matches");
  console.log("Scenario D (IQC rejection): iqc-001 REJECTED for AX-7420-B — should show IQC_REJECTION badge");
  console.log("Scenario E (Weak false-positive): fd-weak-e (WM-3300-A) shares supplier but different part — should NOT appear");
  console.log("Scenario F (Manual link): qlink-manual-001 links fd-001 → defect-001");
  console.log("");
  console.log("=== Quality Intelligence 2.0 Demo Scenarios ===");
  console.log("");
  console.log("PPAP Issue: ppap-003 (APPROVED, CS-3344-D, SteelForged) + iqc-intel-001 (REJECTED) + defect-003 = PPAP approved with issues");
  console.log("IQC Rejection: AX-7420-B + Precision Parts has 2 rejections (iqc-001 REJECTED + iqc-intel-002 ON_HOLD)");
  console.log("FMEA Coverage Gap: fd-intel-gap (PS-2233-B, Precision Parts) — no FMEA exists for this supplier+part");
  console.log("Repeat Issues: AX-7420-B + Precision Parts has defect-001, defect-004, fd-linkage-a, iqc-001, iqc-intel-002");
  console.log("");
  console.log("=== Enterprise OEM Intelligence Scenarios ===");
  console.log("");
  console.log("PPAP Issue: ppap-ent-001 (APPROVED, ENG-5500-X, Precision Parts) + iqc-ent-001 (REJECTED) + fd-ent-001 + defect-ent-001 = PPAP approved with issues");
  console.log("IQC Rejection: ENG-5500-X (REJECTED) + ENG-7700-Y (ON_HOLD)");
  console.log("FMEA Coverage Gap: fd-ent-001 (ENG-5500-X, category: Bearing failure) — FMEA exists but failure mode not covered");
  console.log("FMEA Coverage Gap: fd-ent-002 (ENG-7700-Y, category: Corrosion) — no FMEA exists for SteelForged ENG-7700-Y");
  console.log("High RPN: fmea-ent-001 (ENG-5500-X, max RPN 200) — fatigue failure with severity 10");
  console.log("");
  console.log("=== Supplier Development Action Plans (v2.9.0) ===");
  console.log("");
  console.log("dev-plan-001: CRITICAL, SUPPLIER_ACTION_REQUIRED — Precision Parts, bearing failure");
  console.log("dev-plan-002: HIGH, OEM_REVIEW — SteelForged, heat treatment surface defects");
  console.log("dev-plan-003: MEDIUM, DRAFT — Precision Parts, IQC process improvement");
  console.log("dev-plan-004: LOW, COMPLETED — Precision Parts, dimensional accuracy (closed)");

  // ── Supplier Development Action Plans (v2.9.0) ────────────────────

  await prisma.supplierDevelopmentEvent.deleteMany({ where: { planId: { in: ["dev-plan-001", "dev-plan-002", "dev-plan-003", "dev-plan-004"] } } }).catch(() => {});
  await prisma.supplierDevelopmentActionItem.deleteMany({ where: { planId: { in: ["dev-plan-001", "dev-plan-002", "dev-plan-003", "dev-plan-004"] } } }).catch(() => {});
  await prisma.supplierDevelopmentPlan.deleteMany({ where: { id: { in: ["dev-plan-001", "dev-plan-002", "dev-plan-003", "dev-plan-004"] } } }).catch(() => {});

  const devPlan1 = await prisma.supplierDevelopmentPlan.create({
    data: {
      id: "dev-plan-001",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      title: "Quality Improvement — AX-7420-B Bearing Failure",
      description: "Comprehensive improvement plan for bearing failure defects on AX-7420-B. Triggered by high-risk scorecard findings and multiple IQC rejections.",
      sourceType: "SCORECARD",
      sourceId: supplierCompany.id,
      priority: "CRITICAL",
      status: "SUPPLIER_ACTION_REQUIRED",
      dueDate: new Date("2026-06-30"),
      ownerId: "oem-enterprise-admin",
      createdById: "oem-enterprise-admin",
    },
  });

  await prisma.supplierDevelopmentActionItem.createMany({
    data: [
      { id: "dev-action-001", planId: devPlan1.id, title: "Root cause analysis of bearing failure", description: "Conduct 5-why analysis and identify root cause of bearing failure on AX-7420-B", ownerType: "SUPPLIER", ownerId: "supplier-admin", status: "IN_PROGRESS", dueDate: new Date("2026-05-30") },
      { id: "dev-action-002", planId: devPlan1.id, title: "Process audit of bearing manufacturing line", description: "Full process audit including incoming material inspection", ownerType: "OEM", ownerId: "oem-enterprise-admin", status: "OPEN", dueDate: new Date("2026-06-15") },
      { id: "dev-action-003", planId: devPlan1.id, title: "Implement corrective actions", description: "Based on RCA findings, implement corrective and preventive actions", ownerType: "SUPPLIER", ownerId: "supplier-engineer", status: "OPEN", dueDate: new Date("2026-06-25") },
      { id: "dev-action-004", planId: devPlan1.id, title: "Verify effectiveness of corrective actions", description: "OEM verification that corrective actions are effective", ownerType: "OEM", ownerId: "oem-enterprise-admin", status: "OPEN", dueDate: new Date("2026-06-30") },
    ],
  });

  await prisma.supplierDevelopmentEvent.createMany({
    data: [
      { id: "dev-event-001", planId: devPlan1.id, actorId: "oem-enterprise-admin", type: "PLAN_CREATED", message: "Plan created as draft", metadata: { priority: "CRITICAL", sourceType: "SCORECARD" }, createdAt: new Date("2026-05-01T10:00:00Z") },
      { id: "dev-event-002", planId: devPlan1.id, actorId: "oem-enterprise-admin", type: "PLAN_OPENED", message: "Plan opened", createdAt: new Date("2026-05-02T09:00:00Z") },
      { id: "dev-event-003", planId: devPlan1.id, actorId: "oem-enterprise-admin", type: "PLAN_SENT_TO_SUPPLIER", message: "Plan sent to supplier for action", createdAt: new Date("2026-05-03T08:00:00Z") },
      { id: "dev-event-004", planId: devPlan1.id, actorId: "oem-enterprise-admin", type: "ACTION_ITEM_ADDED", message: "Action item added: Root cause analysis of bearing failure", metadata: { actionItemId: "dev-action-001" }, createdAt: new Date("2026-05-02T10:00:00Z") },
    ],
  });

  const devPlan2 = await prisma.supplierDevelopmentPlan.create({
    data: {
      id: "dev-plan-002",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany2.id,
      title: "Surface Defects — CS-3344-D Heat Treatment Process",
      description: "Address surface defect patterns found in PPAP and IQC for heat treatment process on CS-3344-D.",
      sourceType: "PPAP",
      sourceId: "ppap-ent-001",
      priority: "HIGH",
      status: "OEM_REVIEW",
      dueDate: new Date("2026-07-15"),
      ownerId: "oem-enterprise-admin",
      createdById: "oem-enterprise-admin",
    },
  });

  await prisma.supplierDevelopmentActionItem.createMany({
    data: [
      { id: "dev-action-005", planId: devPlan2.id, title: "Update heat treatment SOP", description: "Revise standard operating procedure for heat treatment process", ownerType: "SUPPLIER", ownerId: "steelforged-admin", status: "SUBMITTED", dueDate: new Date("2026-06-15"), supplierResponse: "SOP revision draft submitted. Updated temperature monitoring procedures and added additional quality checkpoints." },
      { id: "dev-action-006", planId: devPlan2.id, title: "Install additional quality checkpoint", description: "Add in-process inspection after heat treatment", ownerType: "SUPPLIER", ownerId: "steelforged-engineer", status: "IN_PROGRESS", dueDate: new Date("2026-06-30") },
    ],
  });

  await prisma.supplierDevelopmentEvent.createMany({
    data: [
      { id: "dev-event-005", planId: devPlan2.id, actorId: "oem-enterprise-admin", type: "PLAN_CREATED", message: "Plan created and opened", createdAt: new Date("2026-04-20T10:00:00Z") },
      { id: "dev-event-006", planId: devPlan2.id, actorId: "oem-enterprise-admin", type: "PLAN_SENT_TO_SUPPLIER", message: "Plan sent to supplier for action", createdAt: new Date("2026-04-21T09:00:00Z") },
      { id: "dev-event-007", planId: devPlan2.id, actorId: "steelforged-admin", type: "ACTION_ITEM_STATUS_CHANGED", message: "Supplier updated action item: Submit SOP revision to IN_PROGRESS", metadata: { actionItemId: "dev-action-005" }, createdAt: new Date("2026-05-01T09:00:00Z") },
      { id: "dev-event-008", planId: devPlan2.id, actorId: "steelforged-admin", type: "PLAN_SUBMITTED_FOR_REVIEW", message: "Supplier submitted plan for OEM review", createdAt: new Date("2026-05-10T14:00:00Z") },
    ],
  });

  const devPlan3 = await prisma.supplierDevelopmentPlan.create({
    data: {
      id: "dev-plan-003",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      title: "IQC Process Improvement — Incoming Inspection Enhancement",
      description: "Enhance incoming quality control processes based on recurring IQC failures.",
      sourceType: "IQC",
      priority: "MEDIUM",
      status: "DRAFT",
      dueDate: new Date("2026-08-01"),
      ownerId: "oem-enterprise-admin",
      createdById: "oem-enterprise-admin",
    },
  });

  await prisma.supplierDevelopmentActionItem.createMany({
    data: [
      { id: "dev-action-007", planId: devPlan3.id, title: "Review and update incoming inspection procedures", ownerType: "OEM", ownerId: "oem-enterprise-admin", status: "OPEN" },
    ],
  });

  await prisma.supplierDevelopmentEvent.createMany({
    data: [
      { id: "dev-event-009", planId: devPlan3.id, actorId: "oem-enterprise-admin", type: "PLAN_CREATED", message: "Plan created as draft", createdAt: new Date("2026-05-05T11:00:00Z") },
    ],
  });

  const devPlan4 = await prisma.supplierDevelopmentPlan.create({
    data: {
      id: "dev-plan-004",
      oemId: oemEnterpriseCompany.id,
      supplierId: supplierCompany.id,
      title: "Completed Improvement — PS-2233-B Dimensional Accuracy",
      description: "Successfully completed improvement plan for dimensional accuracy issues on PS-2233-B.",
      sourceType: "MANUAL",
      priority: "LOW",
      status: "COMPLETED",
      dueDate: new Date("2026-04-15"),
      completedAt: new Date("2026-04-14"),
      completedById: "oem-enterprise-admin",
      ownerId: "oem-enterprise-admin",
      createdById: "oem-enterprise-admin",
    },
  });

  await prisma.supplierDevelopmentActionItem.createMany({
    data: [
      { id: "dev-action-008", planId: devPlan4.id, title: "Update dimensional measurement process", ownerType: "SUPPLIER", ownerId: "supplier-admin", status: "COMPLETED", completedAt: new Date("2026-04-01") },
      { id: "dev-action-009", planId: devPlan4.id, title: "Verify measurement correlation", ownerType: "OEM", ownerId: "oem-enterprise-admin", status: "ACCEPTED", completedAt: new Date("2026-04-10") },
    ],
  });

  await prisma.supplierDevelopmentEvent.createMany({
    data: [
      { id: "dev-event-010", planId: devPlan4.id, actorId: "oem-enterprise-admin", type: "PLAN_CREATED", message: "Plan created and opened", createdAt: new Date("2026-03-01T10:00:00Z") },
      { id: "dev-event-011", planId: devPlan4.id, actorId: "oem-enterprise-admin", type: "PLAN_SENT_TO_SUPPLIER", message: "Plan sent to supplier", createdAt: new Date("2026-03-02T09:00:00Z") },
      { id: "dev-event-012", planId: devPlan4.id, actorId: "oem-enterprise-admin", type: "PLAN_COMPLETED", message: "Plan completed — all actions verified effective", createdAt: new Date("2026-04-14T16:00:00Z") },
    ],
  });
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });