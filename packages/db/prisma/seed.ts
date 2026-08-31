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

  const existingPlanSheetWorkflow = await prisma.logisticWorkflowDefinition.findUnique({
    where: { companyId_code: { companyId: OEM_ID, code: "PLAN_SHEET_APPROVAL" } },
    include: { versions: { where: { status: "PUBLISHED" }, take: 1 } },
  });
  if (!existingPlanSheetWorkflow) {
    const [admin, firstOwnedProcess] = await Promise.all([
      prisma.user.findFirst({
        where: { companyId: OEM_ID, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
      prisma.logisticFlowNode.findFirst({
        where: {
          kind: "PROCESS",
          flowVersion: { companyId: OEM_ID, status: "PUBLISHED" },
          OR: [
            { responsibleUserId: { not: null } },
            { organizationUnitIdSnapshot: { not: null } },
          ],
        },
        orderBy: { sequence: "asc" },
        select: { responsibleUserId: true, organizationUnitIdSnapshot: true },
      }),
    ]);
    const definition = await prisma.logisticWorkflowDefinition.create({
      data: {
        id: `plan-sheet-workflow-${OEM_ID}`,
        companyId: OEM_ID,
        code: "PLAN_SHEET_APPROVAL",
        name: "Plan Sheet Approval",
        description: "Dynamic review and order-generation workflow for monthly chassis lists.",
        subjectType: "PLAN_SHEET",
        isDefault: true,
      },
    });
    const version = await prisma.logisticWorkflowVersion.create({
      data: {
        id: `plan-sheet-workflow-v1-${OEM_ID}`,
        companyId: OEM_ID,
        definitionId: definition.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: admin?.id,
      },
    });
    await prisma.logisticWorkflowNode.createMany({
      data: [
        {
          id: `plan-sheet-start-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          clientId: "start",
          kind: "START",
          sequence: 0,
          positionX: 60,
          positionY: 180,
          name: "Start",
        },
        {
          id: `plan-sheet-sales-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          clientId: "sales-preparation",
          kind: "TASK",
          sequence: 1,
          positionX: 300,
          positionY: 180,
          name: "Sales Preparation",
          description: "Prepare the chassis list and send it for review.",
          assignmentStrategy: "ACTOR",
          allowedActions: ["PLAN_SHEET_EDIT", "PLAN_SHEET_SUBMIT", "PLAN_SHEET_CANCEL"],
        },
        {
          id: `plan-sheet-review-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          clientId: "production-review",
          kind: "APPROVAL",
          sequence: 2,
          positionX: 560,
          positionY: 180,
          name: "Production Review",
          description: "Set forecast dispatch dates, review lines, and approve or reject the list.",
          assignmentStrategy: firstOwnedProcess?.responsibleUserId
            ? "USER"
            : firstOwnedProcess?.organizationUnitIdSnapshot
              ? "ORGANIZATION_UNIT"
              : "USER",
          responsibleUserId: firstOwnedProcess?.responsibleUserId ?? admin?.id,
          organizationUnitId: firstOwnedProcess?.organizationUnitIdSnapshot,
          allowedActions: [
            "PLAN_SHEET_SET_FORECAST",
            "PLAN_SHEET_REVIEW_LINE",
            "PLAN_SHEET_APPROVE",
            "PLAN_SHEET_REJECT",
          ],
        },
        {
          id: `plan-sheet-end-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          clientId: "end",
          kind: "END",
          sequence: 3,
          positionX: 820,
          positionY: 180,
          name: "End",
        },
      ],
    });
    await prisma.logisticWorkflowEdge.createMany({
      data: [
        {
          id: `plan-sheet-edge-start-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          sourceClientId: "start",
          targetClientId: "sales-preparation",
        },
        {
          id: `plan-sheet-edge-submit-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          sourceClientId: "sales-preparation",
          targetClientId: "production-review",
          actionKey: "PLAN_SHEET_SUBMIT",
        },
        {
          id: `plan-sheet-edge-cancel-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          sourceClientId: "sales-preparation",
          targetClientId: "end",
          actionKey: "PLAN_SHEET_CANCEL",
        },
        {
          id: `plan-sheet-edge-approve-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          sourceClientId: "production-review",
          targetClientId: "end",
          actionKey: "PLAN_SHEET_APPROVE",
        },
        {
          id: `plan-sheet-edge-reject-${OEM_ID}`,
          companyId: OEM_ID,
          workflowVersionId: version.id,
          sourceClientId: "production-review",
          targetClientId: "end",
          actionKey: "PLAN_SHEET_REJECT",
        },
      ],
    });
  }

  const planSheetWorkflow = await prisma.logisticWorkflowDefinition.findUnique({
    where: { companyId_code: { companyId: OEM_ID, code: "PLAN_SHEET_APPROVAL" } },
    include: {
      versions: {
        where: { status: "PUBLISHED" },
        orderBy: { version: "desc" },
        take: 1,
        include: { nodes: true },
      },
    },
  });
  const publishedPlanSheetWorkflow = planSheetWorkflow?.versions[0];
  const salesNode = publishedPlanSheetWorkflow?.nodes.find(
    (node) => node.clientId === "sales-preparation",
  );
  const reviewNode = publishedPlanSheetWorkflow?.nodes.find(
    (node) => node.clientId === "production-review",
  );
  const endNode = publishedPlanSheetWorkflow?.nodes.find(
    (node) => node.clientId === "end",
  );

  if (planSheetWorkflow && publishedPlanSheetWorkflow && salesNode && reviewNode && endNode) {
    const planSheets = await prisma.plantLogisticPlanSheet.findMany({
      where: { companyId: OEM_ID },
      select: {
        id: true,
        status: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        submittedAt: true,
        approvedAt: true,
        rejectedAt: true,
      },
    });
    const existingInstances = await prisma.logisticWorkflowInstance.findMany({
      where: {
        companyId: OEM_ID,
        definitionId: planSheetWorkflow.id,
        subjectType: "PLAN_SHEET",
        subjectId: { in: planSheets.map((sheet) => sheet.id) },
      },
      include: { tasks: { where: { status: "ACTIVE" }, take: 1 } },
    });
    const instanceBySubject = new Map(
      existingInstances.map((instance) => [instance.subjectId, instance]),
    );

    for (const sheet of planSheets) {
      const active = ["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(sheet.status);
      const currentNode = sheet.status === "DRAFT"
        ? salesNode
        : ["SUBMITTED", "UNDER_REVIEW"].includes(sheet.status)
          ? reviewNode
          : endNode;
      let instance = instanceBySubject.get(sheet.id);
      if (!instance) {
        instance = await prisma.logisticWorkflowInstance.create({
          data: {
            id: `plan-sheet-instance-${sheet.id}`,
            companyId: OEM_ID,
            definitionId: planSheetWorkflow.id,
            workflowVersionId: publishedPlanSheetWorkflow.id,
            subjectType: "PLAN_SHEET",
            subjectId: sheet.id,
            currentNodeId: currentNode.id,
            status: active ? "ACTIVE" : "COMPLETED",
            startedAt: sheet.createdAt,
            completedAt: active
              ? null
              : sheet.approvedAt ?? sheet.rejectedAt ?? sheet.updatedAt,
          },
          include: { tasks: { where: { status: "ACTIVE" }, take: 1 } },
        });
      }
      if (active && instance.tasks.length === 0) {
        const assignedUserId = sheet.status === "DRAFT"
          ? sheet.createdById
          : reviewNode.responsibleUserId;
        const assignedOrganizationUnitId = sheet.status === "DRAFT"
          ? null
          : reviewNode.organizationUnitId;
        if (assignedUserId || assignedOrganizationUnitId) {
          await prisma.logisticWorkflowTask.create({
            data: {
              id: `plan-sheet-task-${sheet.id}`,
              companyId: OEM_ID,
              instanceId: instance.id,
              nodeId: currentNode.id,
              assignedUserId,
              assignedOrganizationUnitId,
              allowedActions: currentNode.allowedActions,
              startedAt: sheet.submittedAt ?? sheet.createdAt,
            },
          });
        }
      }
    }
  }

  console.log("Seed complete: Anadolu Isuzu OEM + admin + super admin + org units + PlantLogistic workflow");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
