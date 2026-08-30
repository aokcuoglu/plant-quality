"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  buildSequenceMap,
  defaultHandleCounts,
  validateFlowGraph,
  type FlowGraphNode,
} from "@/lib/logistic/flow-graph"
import { nextVehicleGroupCode, vehicleGroupCodeBase } from "@/lib/logistic/catalog-code"
import type { LogisticOrderPowertrain, LogisticOrderPriority, LogisticProcessType } from "@plantx/db/client"

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string }

async function context(adminOnly = false) {
  const session = await auth()
  if (!session?.user?.id || !session.user.companyId || session.user.companyType !== "OEM") return null
  if (adminOnly && session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") return null
  return { companyId: session.user.companyId, userId: session.user.id, role: session.user.role }
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export interface CatalogActionState {
  status: "idle" | "success" | "error"
  error?: "FORBIDDEN" | "REQUIRED" | "DUPLICATE" | "UNKNOWN"
}

export async function createVehicleGroup(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const actor = await context(true)
  if (!actor) return { status: "error", error: "FORBIDDEN" }
  const name = value(formData, "name")
  if (!name) return { status: "error", error: "REQUIRED" }
  const codeBase = vehicleGroupCodeBase(name)
  const matchingGroups = await prisma.logisticVehicleGroup.findMany({
    where: { companyId: actor.companyId, code: { startsWith: codeBase } },
    select: { code: true },
  })
  const code = nextVehicleGroupCode(codeBase, matchingGroups.map((group) => group.code))
  try {
    await prisma.logisticVehicleGroup.create({ data: { companyId: actor.companyId, name, code, description: value(formData, "description") || null } })
    revalidatePath("/logistic/vehicle-catalog")
    return { status: "success" }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { status: "error", error: "DUPLICATE" }
    }
    return { status: "error", error: "UNKNOWN" }
  }
}

export async function createVehicleModel(_state: CatalogActionState, formData: FormData): Promise<CatalogActionState> {
  const actor = await context(true)
  if (!actor) return { status: "error", error: "FORBIDDEN" }
  const groupId = value(formData, "groupId")
  const group = await prisma.logisticVehicleGroup.findFirst({ where: { id: groupId, companyId: actor.companyId } })
  if (!group) return { status: "error", error: "UNKNOWN" }
  const name = value(formData, "name")
  if (!name) return { status: "error", error: "REQUIRED" }
  const codeBase = vehicleGroupCodeBase(name)
  const matchingModels = await prisma.logisticVehicleModel.findMany({ where: { companyId: actor.companyId, code: { startsWith: codeBase } }, select: { code: true } })
  const code = nextVehicleGroupCode(codeBase, matchingModels.map((model) => model.code))
  try {
    await prisma.logisticVehicleModel.create({ data: { companyId: actor.companyId, groupId, name, code } })
    revalidatePath("/logistic/vehicle-catalog")
    return { status: "success" }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { status: "error", error: "DUPLICATE" }
    return { status: "error", error: "UNKNOWN" }
  }
}

export async function updateVehicleGroup(groupId: string, name: string, description: string): Promise<ActionResult> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const group = await prisma.logisticVehicleGroup.findFirst({ where: { id: groupId, companyId: actor.companyId }, select: { id: true } })
  if (!group || !name.trim()) return { success: false, error: "REQUIRED" }
  try {
    await prisma.logisticVehicleGroup.update({ where: { id: group.id }, data: { name: name.trim(), description: description.trim() || null } })
    revalidatePath("/logistic/vehicle-catalog")
    return { success: true }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { success: false, error: "DUPLICATE" }
    return { success: false, error: "UNKNOWN" }
  }
}

export async function updateVehicleModel(modelId: string, groupId: string, name: string): Promise<ActionResult> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  if (!name.trim()) return { success: false, error: "REQUIRED" }
  const model = await prisma.logisticVehicleModel.findFirst({ where: { id: modelId, companyId: actor.companyId }, select: { id: true } })
  const group = await prisma.logisticVehicleGroup.findFirst({ where: { id: groupId, companyId: actor.companyId }, select: { id: true } })
  if (!model || !group) return { success: false, error: "UNKNOWN" }
  try {
    await prisma.logisticVehicleModel.update({ where: { id: model.id }, data: { name: name.trim(), groupId: group.id } })
    revalidatePath("/logistic/vehicle-catalog")
    return { success: true }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return { success: false, error: "DUPLICATE" }
    return { success: false, error: "UNKNOWN" }
  }
}

export async function createProcess(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const name = value(formData, "name")
  if (!name) return { success: false, error: "REQUIRED" }
  const duration = Number(value(formData, "targetDurationMinutes"))
  try {
    const process = await prisma.logisticProcess.create({
      data: {
        companyId: actor.companyId,
        name,
        type: value(formData, "type") as LogisticProcessType,
        description: value(formData, "description") || null,
        targetDurationMinutes: Number.isInteger(duration) && duration > 0 ? duration : null,
      },
    })
    revalidatePath("/logistic/flows")
    return { success: true, data: { id: process.id } }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { success: false, error: "DUPLICATE" }
    }
    return { success: false, error: "UNKNOWN" }
  }
}

export async function deleteProcess(processId: string): Promise<ActionResult> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const process = await prisma.logisticProcess.findFirst({
    where: { id: processId, companyId: actor.companyId },
    select: { id: true },
  })
  if (!process) return { success: false, error: "UNKNOWN" }
  const inUse = await prisma.logisticFlowNode.count({
    where: {
      processId,
      flowVersion: {
        companyId: actor.companyId,
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
    },
  })
  if (inUse > 0) return { success: false, error: "PROCESS_IN_USE" }
  await prisma.logisticProcess.delete({ where: { id: processId } })
  revalidatePath("/logistic/flows")
  return { success: true }
}

export async function assignFlowNodeOwner(
  nodeId: string,
  organizationUnitId: string | null,
  responsibleUserId: string | null,
): Promise<ActionResult> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const node = await prisma.logisticFlowNode.findFirst({
    where: { id: nodeId, flowVersion: { companyId: actor.companyId }, kind: "PROCESS" },
    select: { id: true },
  })
  if (!node) return { success: false, error: "NODE_NOT_FOUND" }
  if (organizationUnitId) {
    const unit = await prisma.organizationUnit.findFirst({
      where: { id: organizationUnitId, companyId: actor.companyId },
      select: { id: true },
    })
    if (!unit) return { success: false, error: "UNIT_NOT_FOUND" }
  }
  if (responsibleUserId) {
    const user = await prisma.user.findFirst({
      where: { id: responsibleUserId, companyId: actor.companyId },
      select: { id: true },
    })
    if (!user) return { success: false, error: "USER_NOT_FOUND" }
  }
  await prisma.logisticFlowNode.update({
    where: { id: nodeId },
    data: {
      organizationUnitIdSnapshot: organizationUnitId,
      responsibleUserId,
    },
  })
  revalidatePath("/logistic/board")
  return { success: true }
}

export async function ensureDraft(groupId: string): Promise<ActionResult<{ id: string }>> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const group = await prisma.logisticVehicleGroup.findFirst({ where: { id: groupId, companyId: actor.companyId } })
  if (!group) return { success: false, error: "GROUP_NOT_FOUND" }
  const existing = await prisma.logisticFlowVersion.findFirst({ where: { companyId: actor.companyId, groupId, status: "DRAFT" } })
  if (existing) return { success: true, data: { id: existing.id } }
  const published = await prisma.logisticFlowVersion.findFirst({
    where: { companyId: actor.companyId, groupId, status: "PUBLISHED" },
    orderBy: { version: "desc" }, include: { nodes: true, edges: true },
  })
  const last = await prisma.logisticFlowVersion.findFirst({ where: { companyId: actor.companyId, groupId }, orderBy: { version: "desc" } })
  const draft = await prisma.logisticFlowVersion.create({
    data: {
      companyId: actor.companyId, groupId, version: (last?.version ?? 0) + 1, name: `${group.name} v${(last?.version ?? 0) + 1}`,
      nodes: { create: published ? published.nodes.map(({ id: _id, flowVersionId: _flow, ...node }) => node) : [
        { clientId: "start", kind: "START", sequence: 0, nameSnapshot: "Start", positionX: 80, positionY: 180, inputCount: 0, outputCount: 1 },
        { clientId: "end", kind: "END", sequence: 1, nameSnapshot: "End", positionX: 680, positionY: 180, inputCount: 1, outputCount: 0 },
      ] },
      edges: { create: published ? published.edges.map(({ id: _id, flowVersionId: _flow, ...edge }) => edge) : [] },
    },
  })
  revalidatePath("/logistic/flows")
  return { success: true, data: { id: draft.id } }
}

interface DraftNodeInput extends FlowGraphNode {
  processId?: string
  position: { x: number; y: number }
  inputCount?: number
  outputCount?: number
}
interface DraftEdgeInput {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export async function saveFlowDraft(flowVersionId: string, nodes: DraftNodeInput[], edges: DraftEdgeInput[]): Promise<ActionResult> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const flow = await prisma.logisticFlowVersion.findFirst({ where: { id: flowVersionId, companyId: actor.companyId, status: "DRAFT" } })
  if (!flow) return { success: false, error: "DRAFT_NOT_FOUND" }
  const processIds = [...new Set(nodes.flatMap((node) => node.processId ? [node.processId] : []))]
  const processes = await prisma.logisticProcess.findMany({ where: { companyId: actor.companyId, id: { in: processIds }, active: true } })
  if (processes.length !== processIds.length) return { success: false, error: "PROCESS_NOT_FOUND" }
  const processMap = new Map(processes.map((process) => [process.id, process]))
  const graph = validateFlowGraph(nodes, edges)
  const sequence = buildSequenceMap(nodes, graph.orderedIds)
  const existingNodes = await prisma.logisticFlowNode.findMany({
    where: { flowVersionId },
    select: {
      clientId: true,
      organizationUnitIdSnapshot: true,
      responsibleUserId: true,
    },
  })
  const ownerByClientId = new Map(
    existingNodes.map((node) => [
      node.clientId,
      {
        organizationUnitIdSnapshot: node.organizationUnitIdSnapshot,
        responsibleUserId: node.responsibleUserId,
      },
    ]),
  )
  await prisma.$transaction(async (tx) => {
    await tx.logisticFlowEdge.deleteMany({ where: { flowVersionId } })
    await tx.logisticFlowNode.deleteMany({ where: { flowVersionId } })
    await tx.logisticFlowNode.createMany({
      data: nodes.map((node, index) => {
        const process = node.processId ? processMap.get(node.processId) : undefined
        const defaults = defaultHandleCounts(node.kind)
        const preserved = ownerByClientId.get(node.id)
        return {
          flowVersionId,
          clientId: node.id,
          kind: node.kind,
          processId: process?.id ?? null,
          sequence: sequence.get(node.id) ?? index,
          positionX: node.position.x,
          positionY: node.position.y,
          inputCount:
            node.kind === "PROCESS"
              ? Math.max(1, Math.min(8, node.inputCount ?? defaults.inputCount))
              : defaults.inputCount,
          outputCount:
            node.kind === "PROCESS"
              ? Math.max(1, Math.min(8, node.outputCount ?? defaults.outputCount))
              : defaults.outputCount,
          nameSnapshot: process?.name ?? (node.kind === "START" ? "Start" : "End"),
          typeSnapshot: process?.type ?? null,
          descriptionSnapshot: process?.description ?? null,
          organizationUnitIdSnapshot: preserved?.organizationUnitIdSnapshot ?? null,
          responsibleUserId: preserved?.responsibleUserId ?? null,
          targetDurationMinutesSnapshot: process?.targetDurationMinutes ?? null,
        }
      }),
    })
    await tx.logisticFlowEdge.createMany({
      data: edges.map((edge) => ({
        flowVersionId,
        sourceClientId: edge.source,
        targetClientId: edge.target,
        sourceHandle: edge.sourceHandle?.trim() || "out-0",
        targetHandle: edge.targetHandle?.trim() || "in-0",
      })),
    })
  })
  revalidatePath("/logistic/flows")
  return { success: true }
}

export async function publishFlow(flowVersionId: string): Promise<ActionResult> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const flow = await prisma.logisticFlowVersion.findFirst({
    where: { id: flowVersionId, companyId: actor.companyId, status: "DRAFT" }, include: { nodes: { include: { process: true } }, edges: true },
  })
  if (!flow) return { success: false, error: "DRAFT_NOT_FOUND" }
  const graph = validateFlowGraph(
    flow.nodes.map((node) => ({ id: node.clientId, kind: node.kind })),
    flow.edges.map((edge) => ({
      source: edge.sourceClientId,
      target: edge.targetClientId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })),
  )
  if (!graph.valid) return { success: false, error: `INVALID_FLOW:${graph.errors.join(",")}` }
  if (!flow.nodes.some((node) => node.kind === "PROCESS")) return { success: false, error: "PROCESS_REQUIRED" }
  await prisma.$transaction(async (tx) => {
    for (const node of flow.nodes) {
      if (!node.process) continue
      await tx.logisticFlowNode.update({
        where: { id: node.id },
        data: {
          nameSnapshot: node.process.name,
          typeSnapshot: node.process.type,
          descriptionSnapshot: node.process.description,
          targetDurationMinutesSnapshot: node.process.targetDurationMinutes,
        },
      })
    }
    await tx.logisticFlowVersion.updateMany({ where: { companyId: actor.companyId, groupId: flow.groupId, status: "PUBLISHED" }, data: { status: "ARCHIVED" } })
    await tx.logisticFlowVersion.update({ where: { id: flow.id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: actor.userId } })
  })
  revalidatePath("/logistic/flows")
  revalidatePath("/logistic/board")
  return { success: true }
}

export async function startWaitingVehicles(groupId: string): Promise<ActionResult<{ count: number }>> {
  const actor = await context(true)
  if (!actor) return { success: false, error: "FORBIDDEN" }
  const flow = await prisma.logisticFlowVersion.findFirst({ where: { companyId: actor.companyId, groupId, status: "PUBLISHED" }, include: { nodes: { orderBy: { sequence: "asc" } } } })
  const firstProcess = flow?.nodes.find((node) => node.kind === "PROCESS")
  if (!flow || !firstProcess) return { success: false, error: "ACTIVE_FLOW_NOT_FOUND" }
  const units = await prisma.logisticVehicleUnit.findMany({ where: { companyId: actor.companyId, flowStatus: "WAITING_FOR_FLOW", vehicleModel: { groupId }, orderLine: { order: { planSheetId: { not: null } } } }, select: { id: true } })
  await prisma.$transaction(async (tx) => {
    for (const unit of units) {
      await tx.logisticVehicleUnit.update({ where: { id: unit.id }, data: { flowVersionId: flow.id, currentNodeId: firstProcess.id, flowStatus: "ACTIVE", startedAt: new Date(), revision: { increment: 1 } } })
      await tx.logisticVehicleProcessVisit.create({ data: { companyId: actor.companyId, vehicleUnitId: unit.id, nodeId: firstProcess.id, actorId: actor.userId, transitionType: "START" } })
    }
  })
  revalidatePath("/logistic/board")
  return { success: true, data: { count: units.length } }
}

export async function moveVehicleUnit(unitId: string, targetNodeId: string, expectedRevision: number, overrideReason?: string): Promise<ActionResult> {
  const actor = await context()
  if (!actor || actor.role === "VIEWER") return { success: false, error: "FORBIDDEN" }
  const unit = await prisma.logisticVehicleUnit.findFirst({
    where: { id: unitId, companyId: actor.companyId, flowStatus: "ACTIVE" },
    include: {
      flowVersion: {
        include: {
          nodes: { orderBy: { sequence: "asc" } },
          edges: true,
        },
      },
      currentNode: true,
    },
  })
  if (!unit?.flowVersion || !unit.currentNodeId || !unit.currentNode) return { success: false, error: "VEHICLE_NOT_ACTIVE" }
  const currentNodeId = unit.currentNodeId
  const currentClientId = unit.currentNode.clientId
  const nodesById = new Map(unit.flowVersion.nodes.map((node) => [node.id, node]))
  const nodesByClientId = new Map(unit.flowVersion.nodes.map((node) => [node.clientId, node]))
  const target = nodesById.get(targetNodeId)
  if (!target || target.kind === "START") return { success: false, error: "INVALID_TARGET" }

  const legalClientTargets = new Set(
    unit.flowVersion.edges
      .filter((edge) => edge.sourceClientId === currentClientId)
      .map((edge) => edge.targetClientId),
  )
  const isLegalNext = legalClientTargets.has(target.clientId)
  const isAdmin = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN"
  if (!isAdmin && !isLegalNext) return { success: false, error: "NEXT_STEP_ONLY" }
  if (isAdmin && !isLegalNext && !overrideReason?.trim()) return { success: false, error: "OVERRIDE_REASON_REQUIRED" }
  // Ensure override target exists in this flow version
  if (!nodesByClientId.has(target.clientId)) return { success: false, error: "INVALID_TARGET" }

  const transitionType = isAdmin && !isLegalNext ? "ADMIN_OVERRIDE" : target.kind === "END" ? "COMPLETE" : "ADVANCE"
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.logisticVehicleUnit.updateMany({
      where: { id: unit.id, companyId: actor.companyId, currentNodeId, revision: expectedRevision },
      data: { currentNodeId: target.id, revision: { increment: 1 }, flowStatus: target.kind === "END" ? "COMPLETED" : "ACTIVE", completedAt: target.kind === "END" ? new Date() : null },
    })
    if (updated.count !== 1) return false
    await tx.logisticVehicleProcessVisit.updateMany({ where: { companyId: actor.companyId, vehicleUnitId: unit.id, nodeId: currentNodeId, exitedAt: null }, data: { exitedAt: new Date() } })
    await tx.logisticVehicleProcessVisit.create({ data: { companyId: actor.companyId, vehicleUnitId: unit.id, nodeId: target.id, actorId: actor.userId, transitionType, overrideReason: overrideReason?.trim() || null } })
    return true
  })
  if (!result) return { success: false, error: "STALE_REVISION" }
  revalidatePath("/logistic/board")
  return { success: true }
}

export interface OrderLineInput {
  identifier?: string
  vehicleModelId: string
  quantity: number
  variant?: string
  powertrain?: LogisticOrderPowertrain
  priority?: LogisticOrderPriority
}

export async function createOrderLinesAndUnits(orderId: string, lines: OrderLineInput[]): Promise<ActionResult> {
  const actor = await context()
  if (!actor || actor.role === "VIEWER") return { success: false, error: "FORBIDDEN" }
  const order = await prisma.plantLogisticOrder.findFirst({ where: { id: orderId, companyId: actor.companyId }, select: { id: true, orderNumber: true } })
  if (!order || !lines.length || lines.some((line) => line.quantity !== 1)) return { success: false, error: "INVALID_LINES" }
  const models = await prisma.logisticVehicleModel.findMany({ where: { companyId: actor.companyId, id: { in: lines.map((line) => line.vehicleModelId) }, active: true }, include: { group: { include: { flowVersions: { where: { status: "PUBLISHED" }, orderBy: { version: "desc" }, take: 1, include: { nodes: { orderBy: { sequence: "asc" } } } } } } } })
  if (models.length !== new Set(lines.map((line) => line.vehicleModelId)).size) return { success: false, error: "MODEL_NOT_FOUND" }
  const modelMap = new Map(models.map((model) => [model.id, model]))
  await prisma.$transaction(async (tx) => {
    const existingCount = await tx.logisticOrderLine.count({ where: { orderId } })
    for (const [offset, input] of lines.entries()) {
      const model = modelMap.get(input.vehicleModelId)!
      const sequence = existingCount + offset + 1
      const line = await tx.logisticOrderLine.create({ data: { companyId: actor.companyId, orderId, vehicleModelId: model.id, sequence, quantity: input.quantity, variant: input.variant || null, powertrain: input.powertrain, priority: input.priority ?? "NORMAL" } })
      const flow = model.group.flowVersions[0]
      const firstProcess = flow?.nodes.find((node) => node.kind === "PROCESS")
      for (let index = 1; index <= input.quantity; index++) {
        const temporaryUnitCode = `${order.orderNumber}-${String(sequence).padStart(2, "0")}-${String(index).padStart(3, "0")}`
        const identifier = input.identifier?.trim() || null
        const vin = identifier && /^[A-HJ-NPR-Z0-9]{17}$/i.test(identifier) ? identifier.toUpperCase() : null
        const chassisNumber = identifier && !vin ? identifier : null
        const unit = await tx.logisticVehicleUnit.create({ data: { companyId: actor.companyId, orderLineId: line.id, vehicleModelId: model.id, temporaryUnitCode, vin, chassisNumber, flowVersionId: flow?.id, currentNodeId: firstProcess?.id, flowStatus: firstProcess ? "ACTIVE" : "WAITING_FOR_FLOW", startedAt: firstProcess ? new Date() : null } })
        if (firstProcess) await tx.logisticVehicleProcessVisit.create({ data: { companyId: actor.companyId, vehicleUnitId: unit.id, nodeId: firstProcess.id, actorId: actor.userId, transitionType: "START" } })
      }
    }
  })
  revalidatePath(`/logistic/orders/${orderId}`)
  revalidatePath("/logistic/board")
  return { success: true }
}
