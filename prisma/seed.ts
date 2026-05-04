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

  // ── Summary ────────────────────────────────────────────────────────

  console.log("v2.5.2 Seed completed successfully!");
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
  console.log(`Seeded: ${defects.length + freeDefects.length + enterpriseDefects.length} defects, ${ppapSubmissions.length} PPAPs, ${allPpapEvidences.length} PPAP documents, ${iqcReports.length} IQC reports, ${iqcChecklistItems.length} IQC checklist items, ${iqcEvents.length} IQC events, ${fmeas.length} FMEAs, ${fieldDefects.length + freeFieldDefects.length + enterpriseFieldDefects.length} field defects, ${eightDReports.length} 8D reports, ${ppapEvents.length} PPAP events, ${usageCounters.length} usage counters, ${qualityRecordLinks.length} quality record links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });