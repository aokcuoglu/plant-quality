import type {
  LogisticWorkflowNode,
  LogisticWorkflowSubjectType,
} from "@plantx/db/client"
import { prisma } from "@/lib/prisma"
import {
  isTaskAssignee,
  type WorkflowActor,
} from "./workflow-assignment"

export { isTaskAssignee } from "./workflow-assignment"
export type { WorkflowActor } from "./workflow-assignment"

export interface WorkflowAccess {
  hasWorkflow: boolean
  isAssignee: boolean
  allowedActions: string[]
  activeNodeName: string | null
  assignedUserName: string | null
  assignedOrganizationUnitName: string | null
}

type RuntimeNode = Pick<
  LogisticWorkflowNode,
  | "id"
  | "kind"
  | "assignmentStrategy"
  | "responsibleUserId"
  | "organizationUnitId"
  | "allowedActions"
>

function resolveAssignment(
  node: RuntimeNode,
  actorUserId: string,
): { assignedUserId: string | null; assignedOrganizationUnitId: string | null } {
  if (node.assignmentStrategy === "ACTOR") {
    return { assignedUserId: actorUserId, assignedOrganizationUnitId: null }
  }
  if (node.assignmentStrategy === "USER") {
    return {
      assignedUserId: node.responsibleUserId,
      assignedOrganizationUnitId: node.organizationUnitId,
    }
  }
  if (node.assignmentStrategy === "ORGANIZATION_UNIT") {
    return {
      assignedUserId: null,
      assignedOrganizationUnitId: node.organizationUnitId,
    }
  }
  return { assignedUserId: null, assignedOrganizationUnitId: null }
}

async function loadActor(companyId: string, userId: string): Promise<WorkflowActor | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, role: true, orgUnitId: true },
  })
  return user
    ? {
        companyId,
        userId: user.id,
        role: user.role,
        organizationUnitId: user.orgUnitId,
      }
    : null
}

export async function startWorkflowInstance(input: {
  companyId: string
  subjectType: LogisticWorkflowSubjectType
  subjectId: string
  actorUserId: string
}): Promise<{ success: true; instanceId: string } | { success: false; error: string }> {
  const definition = await prisma.logisticWorkflowDefinition.findFirst({
    where: {
      companyId: input.companyId,
      subjectType: input.subjectType,
      active: true,
      isDefault: true,
    },
    include: {
      versions: {
        where: { companyId: input.companyId, status: "PUBLISHED" },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          nodes: { where: { companyId: input.companyId }, orderBy: { sequence: "asc" } },
          edges: { where: { companyId: input.companyId } },
        },
      },
    },
  })
  const version = definition?.versions[0]
  if (!definition || !version) return { success: false, error: "WORKFLOW_NOT_PUBLISHED" }

  const start = version.nodes.find((node) => node.kind === "START")
  const firstEdge = start
    ? version.edges.find(
        (edge) => edge.sourceClientId === start.clientId && !edge.actionKey,
      )
    : null
  const firstNode = firstEdge
    ? version.nodes.find((node) => node.clientId === firstEdge.targetClientId)
    : null
  if (!start || !firstNode || firstNode.kind === "END") {
    return { success: false, error: "WORKFLOW_INVALID_START" }
  }
  const assignment = resolveAssignment(firstNode, input.actorUserId)
  if (!assignment.assignedUserId && !assignment.assignedOrganizationUnitId) {
    return { success: false, error: "WORKFLOW_ASSIGNEE_REQUIRED" }
  }

  try {
    const instance = await prisma.$transaction(async (tx) => {
      const created = await tx.logisticWorkflowInstance.create({
        data: {
          companyId: input.companyId,
          definitionId: definition.id,
          workflowVersionId: version.id,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          currentNodeId: firstNode.id,
        },
      })
      await tx.logisticWorkflowTask.create({
        data: {
          companyId: input.companyId,
          instanceId: created.id,
          nodeId: firstNode.id,
          assignedUserId: assignment.assignedUserId,
          assignedOrganizationUnitId: assignment.assignedOrganizationUnitId,
          allowedActions: firstNode.allowedActions,
        },
      })
      await tx.logisticWorkflowEvent.create({
        data: {
          companyId: input.companyId,
          instanceId: created.id,
          fromNodeId: start.id,
          toNodeId: firstNode.id,
          actorId: input.actorUserId,
          message: "Workflow started",
        },
      })
      return created
    })
    return { success: true, instanceId: instance.id }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await prisma.logisticWorkflowInstance.findFirst({
        where: {
          companyId: input.companyId,
          definitionId: definition.id,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
        },
        select: { id: true },
      })
      if (existing) return { success: true, instanceId: existing.id }
    }
    return { success: false, error: "WORKFLOW_START_FAILED" }
  }
}

export async function getWorkflowAccess(input: {
  companyId: string
  subjectType: LogisticWorkflowSubjectType
  subjectId: string
  userId: string
}): Promise<WorkflowAccess> {
  const [actor, task] = await Promise.all([
    loadActor(input.companyId, input.userId),
    prisma.logisticWorkflowTask.findFirst({
      where: {
        companyId: input.companyId,
        status: "ACTIVE",
        instance: {
          companyId: input.companyId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          status: "ACTIVE",
        },
      },
      include: {
        node: { select: { name: true } },
        assignedUser: { select: { name: true, email: true } },
        assignedOrganizationUnit: { select: { name: true } },
      },
      orderBy: { startedAt: "desc" },
    }),
  ])
  if (!task) {
    const instance = await prisma.logisticWorkflowInstance.findFirst({
      where: {
        companyId: input.companyId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
      },
      select: { id: true },
    })
    return {
      hasWorkflow: Boolean(instance),
      isAssignee: false,
      allowedActions: [],
      activeNodeName: null,
      assignedUserName: null,
      assignedOrganizationUnitName: null,
    }
  }
  const isAssignee = actor ? isTaskAssignee(actor, task) : false
  return {
    hasWorkflow: true,
    isAssignee,
    allowedActions: isAssignee ? task.allowedActions : [],
    activeNodeName: task.node.name,
    assignedUserName: task.assignedUser
      ? task.assignedUser.name?.trim() || task.assignedUser.email
      : null,
    assignedOrganizationUnitName: task.assignedOrganizationUnit?.name ?? null,
  }
}

async function authorizeWorkflowAction(input: {
  companyId: string
  subjectType: LogisticWorkflowSubjectType
  subjectId: string
  userId: string
  actionKey: string
}) {
  const [actor, task] = await Promise.all([
    loadActor(input.companyId, input.userId),
    prisma.logisticWorkflowTask.findFirst({
      where: {
        companyId: input.companyId,
        status: "ACTIVE",
        allowedActions: { has: input.actionKey },
        instance: {
          companyId: input.companyId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          status: "ACTIVE",
        },
      },
      include: {
        instance: {
          include: {
            currentNode: true,
            workflowVersion: {
              include: {
                nodes: { where: { companyId: input.companyId } },
                edges: { where: { companyId: input.companyId } },
              },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    }),
  ])
  if (!actor || !task || !isTaskAssignee(actor, task)) return null
  return { actor, task }
}

export async function assertWorkflowActionAllowed(input: {
  companyId: string
  subjectType: LogisticWorkflowSubjectType
  subjectId: string
  userId: string
  actionKey: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const authorized = await authorizeWorkflowAction(input)
  return authorized
    ? { success: true }
    : { success: false, error: "WORKFLOW_ACTION_FORBIDDEN" }
}

export async function transitionWorkflowAction(input: {
  companyId: string
  subjectType: LogisticWorkflowSubjectType
  subjectId: string
  userId: string
  actionKey: string
  resolution?: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const authorized = await authorizeWorkflowAction(input)
  if (!authorized) return { success: false, error: "WORKFLOW_ACTION_FORBIDDEN" }
  const { task } = authorized
  const instance = task.instance
  const currentNode = instance.currentNode
  if (!currentNode || currentNode.id !== task.nodeId) {
    return { success: false, error: "WORKFLOW_TASK_STALE" }
  }
  const edge = instance.workflowVersion.edges.find(
    (candidate) =>
      candidate.sourceClientId === currentNode.clientId &&
      candidate.actionKey === input.actionKey,
  )
  const target = edge
    ? instance.workflowVersion.nodes.find(
        (candidate) => candidate.clientId === edge.targetClientId,
      )
    : null
  if (!target) return { success: false, error: "WORKFLOW_TRANSITION_NOT_FOUND" }

  const assignment = resolveAssignment(target, input.userId)
  if (
    target.kind !== "END" &&
    !assignment.assignedUserId &&
    !assignment.assignedOrganizationUnitId
  ) {
    return { success: false, error: "WORKFLOW_ASSIGNEE_REQUIRED" }
  }

  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.logisticWorkflowInstance.updateMany({
      where: {
        id: instance.id,
        companyId: input.companyId,
        currentNodeId: currentNode.id,
        revision: instance.revision,
        status: "ACTIVE",
      },
      data: {
        currentNodeId: target.id,
        revision: { increment: 1 },
        status: target.kind === "END" ? "COMPLETED" : "ACTIVE",
        completedAt: target.kind === "END" ? new Date() : null,
      },
    })
    if (updated.count !== 1) return false
    await tx.logisticWorkflowTask.updateMany({
      where: { id: task.id, companyId: input.companyId, status: "ACTIVE" },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: input.userId,
        resolution: input.resolution?.trim() || input.actionKey,
      },
    })
    if (target.kind !== "END") {
      await tx.logisticWorkflowTask.create({
        data: {
          companyId: input.companyId,
          instanceId: instance.id,
          nodeId: target.id,
          assignedUserId: assignment.assignedUserId,
          assignedOrganizationUnitId: assignment.assignedOrganizationUnitId,
          allowedActions: target.allowedActions,
        },
      })
    }
    await tx.logisticWorkflowEvent.create({
      data: {
        companyId: input.companyId,
        instanceId: instance.id,
        fromNodeId: currentNode.id,
        toNodeId: target.id,
        actionKey: input.actionKey,
        actorId: input.userId,
        message: input.resolution?.trim() || input.actionKey,
      },
    })
    return true
  })

  return moved
    ? { success: true }
    : { success: false, error: "WORKFLOW_TASK_STALE" }
}
