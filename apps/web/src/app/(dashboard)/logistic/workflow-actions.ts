"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type {
  LogisticWorkflowSubjectType,
  Role,
} from "@plantx/db/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminRole, isEditorRole } from "@/lib/roles"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import {
  WORKFLOW_ACTIONS,
  type WorkflowDraftEdgeInput,
  type WorkflowDraftNodeInput,
} from "@/lib/logistic/workflow-contract"
import {
  validateWorkflowActionRoutes,
  validateWorkflowGraph,
} from "@/lib/logistic/workflow-graph"

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function adminContext() {
  const session = await auth()
  if (!session?.user?.id || !session.user.companyId) redirect("/login")
  if (session.user.companyType !== "OEM") return null
  if (!requireModule(session, "PLANT_LOGISTIC_MODULE").allowed) return null
  if (!requireFeature(session, "PLANT_LOGISTIC").allowed) return null
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, companyId: session.user.companyId },
    select: { id: true, role: true },
  })
  if (!user || !isAdminRole(user.role)) return null
  return {
    companyId: session.user.companyId,
    userId: user.id,
    role: user.role as Role,
  }
}

function workflowCode(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 64)
}

async function validateWorkflowAssignments(
  companyId: string,
  nodes: WorkflowDraftNodeInput[],
): Promise<string | null> {
  const userAssignedNodes = nodes.filter(
    (node) => node.assignmentStrategy === "USER" && node.responsibleUserId,
  )
  const userIds = [
    ...new Set(
      userAssignedNodes.flatMap((node) =>
        node.responsibleUserId ? [node.responsibleUserId] : [],
      ),
    ),
  ]
  const unitIds = [
    ...new Set(
      nodes.flatMap((node) =>
        (node.assignmentStrategy === "USER"
          || node.assignmentStrategy === "ORGANIZATION_UNIT")
        && node.organizationUnitId
          ? [node.organizationUnitId]
          : [],
      ),
    ),
  ]
  const [users, unitCount] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, id: { in: userIds } },
      select: { id: true, role: true, orgUnitId: true },
    }),
    prisma.organizationUnit.count({
      where: { companyId, id: { in: unitIds } },
    }),
  ])
  if (users.length !== userIds.length) return "USER_NOT_FOUND"
  if (unitCount !== unitIds.length) return "UNIT_NOT_FOUND"

  const userById = new Map(users.map((user) => [user.id, user]))
  for (const node of userAssignedNodes) {
    if (!node.responsibleUserId) continue
    const user = userById.get(node.responsibleUserId)
    if (!user || !isEditorRole(user.role)) return "USER_NOT_ELIGIBLE"
    if (node.organizationUnitId && user.orgUnitId !== node.organizationUnitId) {
      return "USER_UNIT_MISMATCH"
    }
  }
  return null
}

export async function createWorkflowDefinition(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const subjectType = String(formData.get("subjectType") ?? "") as LogisticWorkflowSubjectType
  if (!name || !(subjectType in WORKFLOW_ACTIONS)) {
    return { success: false, error: "REQUIRED" }
  }
  const baseCode = workflowCode(name) || "WORKFLOW"
  const matches = await prisma.logisticWorkflowDefinition.findMany({
    where: { companyId: actor.companyId, code: { startsWith: baseCode } },
    select: { code: true },
  })
  const existing = new Set(matches.map(({ code }) => code))
  let code = baseCode
  for (let suffix = 2; existing.has(code); suffix++) code = `${baseCode}_${suffix}`
  const hasDefault = await prisma.logisticWorkflowDefinition.count({
    where: { companyId: actor.companyId, subjectType, active: true, isDefault: true },
  })
  const definition = await prisma.logisticWorkflowDefinition.create({
    data: {
      companyId: actor.companyId,
      code,
      name,
      description: description || null,
      subjectType,
      isDefault: hasDefault === 0,
    },
  })
  revalidatePath("/logistic/flows")
  return { success: true, data: { id: definition.id } }
}

export async function setDefaultWorkflowDefinition(
  definitionId: string,
): Promise<ActionResult> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const definition = await prisma.logisticWorkflowDefinition.findFirst({
    where: { id: definitionId, companyId: actor.companyId, active: true },
    select: { id: true, subjectType: true },
  })
  if (!definition) return { success: false, error: "WORKFLOW_NOT_FOUND" }
  await prisma.$transaction([
    prisma.logisticWorkflowDefinition.updateMany({
      where: {
        companyId: actor.companyId,
        subjectType: definition.subjectType,
        isDefault: true,
      },
      data: { isDefault: false },
    }),
    prisma.logisticWorkflowDefinition.updateMany({
      where: { id: definition.id, companyId: actor.companyId },
      data: { isDefault: true },
    }),
  ])
  revalidatePath("/logistic/flows")
  return { success: true }
}

export async function ensureWorkflowDraft(
  definitionId: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const definition = await prisma.logisticWorkflowDefinition.findFirst({
    where: { id: definitionId, companyId: actor.companyId, active: true },
    include: {
      versions: {
        where: { companyId: actor.companyId },
        orderBy: { version: "desc" },
        include: {
          nodes: { where: { companyId: actor.companyId } },
          edges: { where: { companyId: actor.companyId } },
        },
      },
    },
  })
  if (!definition) return { success: false, error: "WORKFLOW_NOT_FOUND" }
  const existing = definition.versions.find((version) => version.status === "DRAFT")
  if (existing) return { success: true, data: { id: existing.id } }
  const published = definition.versions.find((version) => version.status === "PUBLISHED")
  const nextVersion = (definition.versions[0]?.version ?? 0) + 1
  const draft = await prisma.logisticWorkflowVersion.create({
    data: {
      companyId: actor.companyId,
      definitionId: definition.id,
      version: nextVersion,
      nodes: {
        create: published
          ? published.nodes.map((node) => ({
              companyId: actor.companyId,
              clientId: node.clientId,
              kind: node.kind,
              sequence: node.sequence,
              positionX: node.positionX,
              positionY: node.positionY,
              name: node.name,
              description: node.description,
              assignmentStrategy: node.assignmentStrategy,
              organizationUnitId: node.organizationUnitId,
              responsibleUserId: node.responsibleUserId,
              taskScope: node.taskScope,
              allowedActions: node.allowedActions,
              automationActionKey: node.automationActionKey,
              targetDurationMinutes: node.targetDurationMinutes,
              configuration: node.configuration ?? undefined,
            }))
          : [
              {
                companyId: actor.companyId,
                clientId: "start",
                kind: "START" as const,
                sequence: 0,
                positionX: 60,
                positionY: 180,
                name: "Start",
              },
              {
                companyId: actor.companyId,
                clientId: "end",
                kind: "END" as const,
                sequence: 1,
                positionX: 760,
                positionY: 180,
                name: "End",
              },
            ],
      },
      edges: {
        create: published
          ? published.edges.map((edge) => ({
              companyId: actor.companyId,
              sourceClientId: edge.sourceClientId,
              targetClientId: edge.targetClientId,
              actionKey: edge.actionKey,
              label: edge.label,
            }))
          : [],
      },
    },
  })
  revalidatePath("/logistic/flows")
  return { success: true, data: { id: draft.id } }
}

async function workflowDraftIsInUse(workflowVersionId: string, companyId: string) {
  const [instanceCount, taskCount] = await Promise.all([
    prisma.logisticWorkflowInstance.count({
      where: { companyId, workflowVersionId },
    }),
    prisma.logisticWorkflowTask.count({
      where: { companyId, node: { workflowVersionId } },
    }),
  ])
  return instanceCount > 0 || taskCount > 0
}

export async function deleteWorkflowDraft(
  workflowVersionId: string,
): Promise<ActionResult> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const draft = await prisma.logisticWorkflowVersion.findFirst({
    where: {
      id: workflowVersionId,
      companyId: actor.companyId,
      status: "DRAFT",
    },
    select: { id: true },
  })
  if (!draft) return { success: false, error: "DRAFT_NOT_FOUND" }
  if (await workflowDraftIsInUse(draft.id, actor.companyId)) {
    return { success: false, error: "DRAFT_IN_USE" }
  }

  try {
    await prisma.logisticWorkflowVersion.delete({
      where: { id: draft.id, companyId: actor.companyId },
    })
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "P2003"
    ) {
      return { success: false, error: "DRAFT_IN_USE" }
    }
    return { success: false, error: "UNKNOWN" }
  }
  revalidatePath("/logistic/flows")
  return { success: true }
}

export async function restoreWorkflowVersion(
  sourceVersionId: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const source = await prisma.logisticWorkflowVersion.findFirst({
    where: {
      id: sourceVersionId,
      companyId: actor.companyId,
      status: { in: ["PUBLISHED", "ARCHIVED"] },
    },
    include: {
      nodes: { where: { companyId: actor.companyId } },
      edges: { where: { companyId: actor.companyId } },
    },
  })
  if (!source) return { success: false, error: "VERSION_NOT_FOUND" }

  const existingDraft = await prisma.logisticWorkflowVersion.findFirst({
    where: {
      companyId: actor.companyId,
      definitionId: source.definitionId,
      status: "DRAFT",
    },
    select: { id: true, version: true },
  })
  if (existingDraft && await workflowDraftIsInUse(existingDraft.id, actor.companyId)) {
    return { success: false, error: "DRAFT_IN_USE" }
  }

  try {
    const draftId = await prisma.$transaction(async (tx) => {
      let target = existingDraft
      if (!target) {
        const latest = await tx.logisticWorkflowVersion.findFirst({
          where: {
            companyId: actor.companyId,
            definitionId: source.definitionId,
          },
          orderBy: { version: "desc" },
          select: { version: true },
        })
        target = await tx.logisticWorkflowVersion.create({
          data: {
            companyId: actor.companyId,
            definitionId: source.definitionId,
            version: (latest?.version ?? 0) + 1,
          },
          select: { id: true, version: true },
        })
      } else {
        await tx.logisticWorkflowEdge.deleteMany({
          where: {
            companyId: actor.companyId,
            workflowVersionId: target.id,
          },
        })
        await tx.logisticWorkflowNode.deleteMany({
          where: {
            companyId: actor.companyId,
            workflowVersionId: target.id,
          },
        })
      }

      await tx.logisticWorkflowNode.createMany({
        data: source.nodes.map((node) => ({
          companyId: actor.companyId,
          workflowVersionId: target.id,
          clientId: node.clientId,
          kind: node.kind,
          sequence: node.sequence,
          positionX: node.positionX,
          positionY: node.positionY,
          name: node.name,
          description: node.description,
          assignmentStrategy: node.assignmentStrategy,
          organizationUnitId: node.organizationUnitId,
          responsibleUserId: node.responsibleUserId,
          taskScope: node.taskScope,
          allowedActions: node.allowedActions,
          automationActionKey: node.automationActionKey,
          targetDurationMinutes: node.targetDurationMinutes,
          configuration: node.configuration ?? undefined,
        })),
      })
      await tx.logisticWorkflowEdge.createMany({
        data: source.edges.map((edge) => ({
          companyId: actor.companyId,
          workflowVersionId: target.id,
          sourceClientId: edge.sourceClientId,
          targetClientId: edge.targetClientId,
          actionKey: edge.actionKey,
          label: edge.label,
        })),
      })
      return target.id
    })

    revalidatePath("/logistic/flows")
    return { success: true, data: { id: draftId } }
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "P2003"
    ) {
      return { success: false, error: "DRAFT_IN_USE" }
    }
    return { success: false, error: "UNKNOWN" }
  }
}

export async function saveWorkflowDraft(
  workflowVersionId: string,
  nodes: WorkflowDraftNodeInput[],
  edges: WorkflowDraftEdgeInput[],
): Promise<ActionResult> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const version = await prisma.logisticWorkflowVersion.findFirst({
    where: { id: workflowVersionId, companyId: actor.companyId, status: "DRAFT" },
    include: { definition: { select: { subjectType: true } } },
  })
  if (!version) return { success: false, error: "DRAFT_NOT_FOUND" }
  const graph = validateWorkflowGraph(nodes, edges)
  const routeErrors = validateWorkflowActionRoutes(version.definition.subjectType, nodes, edges)
  if (!graph.valid || routeErrors.length > 0) {
    return {
      success: false,
      error: `INVALID_FLOW:${[...graph.errors, ...routeErrors].join(",")}`,
    }
  }

  const allowedRegistry = new Set<string>(WORKFLOW_ACTIONS[version.definition.subjectType])
  if (nodes.some((node) => node.allowedActions.some((action) => !allowedRegistry.has(action)))) {
    return { success: false, error: "UNKNOWN_ACTION" }
  }
  if (edges.some((edge) => edge.actionKey && !allowedRegistry.has(edge.actionKey))) {
    return { success: false, error: "UNKNOWN_ACTION" }
  }
  const assignmentError = await validateWorkflowAssignments(actor.companyId, nodes)
  if (assignmentError) return { success: false, error: assignmentError }

  const sequence = new Map(graph.orderedIds.map((id, index) => [id, index]))
  await prisma.$transaction(async (tx) => {
    await tx.logisticWorkflowEdge.deleteMany({
      where: { companyId: actor.companyId, workflowVersionId: version.id },
    })
    await tx.logisticWorkflowNode.deleteMany({
      where: { companyId: actor.companyId, workflowVersionId: version.id },
    })
    await tx.logisticWorkflowNode.createMany({
      data: nodes.map((node) => ({
        companyId: actor.companyId,
        workflowVersionId: version.id,
        clientId: node.id,
        kind: node.kind,
        sequence: sequence.get(node.id) ?? 0,
        positionX: node.position.x,
        positionY: node.position.y,
        name: node.name.trim(),
        description: node.description?.trim() || null,
        assignmentStrategy: node.assignmentStrategy,
        organizationUnitId:
          node.assignmentStrategy === "USER"
          || node.assignmentStrategy === "ORGANIZATION_UNIT"
            ? node.organizationUnitId || null
            : null,
        responsibleUserId:
          node.assignmentStrategy === "USER"
            ? node.responsibleUserId || null
            : null,
        taskScope: node.taskScope,
        allowedActions: node.allowedActions,
        automationActionKey: node.automationActionKey || null,
        targetDurationMinutes:
          node.targetDurationMinutes && node.targetDurationMinutes > 0
            ? Math.round(node.targetDurationMinutes)
            : null,
      })),
    })
    await tx.logisticWorkflowEdge.createMany({
      data: edges.map((edge) => ({
        companyId: actor.companyId,
        workflowVersionId: version.id,
        sourceClientId: edge.source,
        targetClientId: edge.target,
        actionKey: edge.actionKey || null,
        label: edge.label?.trim() || null,
      })),
    })
  })
  revalidatePath("/logistic/flows")
  return { success: true }
}

export async function publishWorkflow(
  workflowVersionId: string,
): Promise<ActionResult> {
  const actor = await adminContext()
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const version = await prisma.logisticWorkflowVersion.findFirst({
    where: { id: workflowVersionId, companyId: actor.companyId, status: "DRAFT" },
    include: {
      definition: { select: { id: true, subjectType: true } },
      nodes: { where: { companyId: actor.companyId } },
      edges: { where: { companyId: actor.companyId } },
    },
  })
  if (!version) return { success: false, error: "DRAFT_NOT_FOUND" }
  const graph = validateWorkflowGraph(
    version.nodes.map((node) => ({
      id: node.clientId,
      kind: node.kind,
      name: node.name,
      description: node.description,
      position: { x: node.positionX, y: node.positionY },
      assignmentStrategy: node.assignmentStrategy,
      organizationUnitId: node.organizationUnitId,
      responsibleUserId: node.responsibleUserId,
      taskScope: node.taskScope,
      allowedActions: node.allowedActions,
      automationActionKey: node.automationActionKey,
      targetDurationMinutes: node.targetDurationMinutes,
    })),
    version.edges.map((edge) => ({
      source: edge.sourceClientId,
      target: edge.targetClientId,
      actionKey: edge.actionKey,
      label: edge.label,
    })),
  )
  const routeErrors = validateWorkflowActionRoutes(
    version.definition.subjectType,
    version.nodes.map((node) => ({
      id: node.clientId,
      kind: node.kind,
      name: node.name,
      description: node.description,
      position: { x: node.positionX, y: node.positionY },
      assignmentStrategy: node.assignmentStrategy,
      organizationUnitId: node.organizationUnitId,
      responsibleUserId: node.responsibleUserId,
      taskScope: node.taskScope,
      allowedActions: node.allowedActions,
      automationActionKey: node.automationActionKey,
      targetDurationMinutes: node.targetDurationMinutes,
    })),
    version.edges.map((edge) => ({
      source: edge.sourceClientId,
      target: edge.targetClientId,
      actionKey: edge.actionKey,
      label: edge.label,
    })),
  )
  if (!graph.valid || routeErrors.length > 0) {
    return {
      success: false,
      error: `INVALID_FLOW:${[...graph.errors, ...routeErrors].join(",")}`,
    }
  }
  const assignmentError = await validateWorkflowAssignments(
    actor.companyId,
    version.nodes.map((node) => ({
      id: node.clientId,
      kind: node.kind,
      name: node.name,
      description: node.description,
      position: { x: node.positionX, y: node.positionY },
      assignmentStrategy: node.assignmentStrategy,
      organizationUnitId: node.organizationUnitId,
      responsibleUserId: node.responsibleUserId,
      taskScope: node.taskScope,
      allowedActions: node.allowedActions,
      automationActionKey: node.automationActionKey,
      targetDurationMinutes: node.targetDurationMinutes,
    })),
  )
  if (assignmentError) return { success: false, error: assignmentError }

  await prisma.$transaction([
    prisma.logisticWorkflowVersion.updateMany({
      where: {
        companyId: actor.companyId,
        definitionId: version.definition.id,
        status: "PUBLISHED",
      },
      data: { status: "ARCHIVED" },
    }),
    prisma.logisticWorkflowVersion.updateMany({
      where: { id: version.id, companyId: actor.companyId, status: "DRAFT" },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        publishedById: actor.userId,
      },
    }),
  ])
  revalidatePath("/logistic/flows")
  return { success: true }
}
