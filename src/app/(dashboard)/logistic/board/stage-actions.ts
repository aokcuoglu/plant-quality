"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type {
  LogisticOrderStatus,
  ProductionMilestoneGate,
  ProductionMilestoneStatus,
  LogisticOrderEventType,
  DispatchStatus,
} from "@/generated/prisma/client"
import { VEHICLE_STAGES, type VehicleStage } from "@/lib/logistic/stage"
import { labelForGate } from "@/lib/logistic/milestone-types"

interface StageActionResult {
  success: boolean
  error?: string
  finalStatus?: DispatchStatus
}

const TERMINAL_MILESTONE: ProductionMilestoneStatus[] = [
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
]

const TERMINAL_DISPATCH: DispatchStatus[] = ["DELIVERED", "CANCELLED"]

async function authGate() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  return { companyId: session.user.companyId as string, userId: session.user.id as string }
}

interface LoadedOrder {
  id: string
  companyId: string
  status: LogisticOrderStatus
  milestones: {
    id: string
    gate: ProductionMilestoneGate
    status: ProductionMilestoneStatus
    sequence: number
    qualityHold: boolean
  }[]
  yardStatus: { id: string; readyForDispatch: boolean; blockedForDispatch: boolean } | null
  dispatches: { id: string; status: DispatchStatus }[]
}

async function loadOrder(orderId: string, companyId: string): Promise<LoadedOrder | null> {
  return prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      milestones: { orderBy: { sequence: "asc" } },
      yardStatus: { select: { id: true, readyForDispatch: true, blockedForDispatch: true } },
      dispatches: { orderBy: { createdAt: "desc" }, select: { id: true, status: true } },
    },
  })
}

async function logEvent(
  orderId: string,
  companyId: string,
  actorId: string,
  eventType: LogisticOrderEventType,
  message: string
) {
  await prisma.plantLogisticOrderEvent.create({
    data: { orderId, companyId, actorId, eventType, message },
  })
}

async function setMilestoneStatus(
  order: LoadedOrder,
  userId: string,
  gate: ProductionMilestoneGate,
  status: ProductionMilestoneStatus
) {
  const milestone = order.milestones.find((m) => m.gate === gate)
  if (milestone) {
    if (milestone.status !== status) {
      await prisma.plantLogisticProductionMilestone.update({
        where: { id: milestone.id },
        data: { status, updatedById: userId, qualityHold: status === "QUALITY_HOLD" },
      })
    }
    return
  }

  const maxSeq = order.milestones.reduce((max, m) => Math.max(max, m.sequence), 0)
  const created = await prisma.plantLogisticProductionMilestone.create({
    data: {
      orderId: order.id,
      companyId: order.companyId,
      sequence: maxSeq + 1,
      gate,
      title: labelForGate(gate),
      status,
      qualityHold: status === "QUALITY_HOLD",
      createdById: userId,
      updatedById: userId,
    },
  })
  order.milestones.push({
    id: created.id,
    gate,
    status,
    sequence: created.sequence,
    qualityHold: status === "QUALITY_HOLD",
  })
}

async function setYardReady(
  orderId: string,
  companyId: string,
  userId: string,
  ready: boolean
) {
  const existing = await prisma.plantLogisticYardStatus.findUnique({ where: { orderId } })
  if (existing) {
    await prisma.plantLogisticYardStatus.update({
      where: { orderId },
      data: {
        readyForDispatch: ready,
        blockedForDispatch: false,
        blockReason: null,
        lastMovementAt: new Date(),
        updatedById: userId,
      },
    })
  } else {
    await prisma.plantLogisticYardStatus.create({
      data: {
        orderId,
        companyId,
        readyForDispatch: ready,
        lastMovementAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    })
  }
}

async function advanceDispatchTo(
  orderId: string,
  companyId: string,
  userId: string,
  target: DispatchStatus
): Promise<StageActionResult> {
  const dispatches = await prisma.plantLogisticDispatch.findMany({
    where: { orderId, companyId, status: { notIn: TERMINAL_DISPATCH } },
    orderBy: { createdAt: "desc" },
  })
  const dispatch = dispatches[0]
  if (!dispatch) return { success: false, error: "No active dispatch found. Create a dispatch first." }

  const chain: DispatchStatus[] = [
    "NOT_PLANNED",
    "PLANNED",
    "CARRIER_ASSIGNED",
    "LOADING_PLANNED",
    "LOADED",
    "IN_TRANSIT",
    "ARRIVED",
    "DELIVERED",
  ]
  const fromIdx = chain.indexOf(dispatch.status)
  const toIdx = chain.indexOf(target)
  if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) {
    return { success: false, error: `Dispatch cannot advance to ${target.replace(/_/g, " ")}` }
  }

  let current = dispatch.status
  for (let i = fromIdx + 1; i <= toIdx; i++) {
    const next = chain[i]
    const now = new Date()
    const update: Record<string, unknown> = { status: next, updatedById: userId }
    if (next === "LOADED") update.actualLoadingDate = now
    if (next === "ARRIVED") update.actualArrivalDate = now
    if (next === "DELIVERED") update.deliveredAt = now
    await prisma.plantLogisticDispatch.update({ where: { id: dispatch.id }, data: update })
    current = next

    const eventMap: Record<string, string> = {
      PLANNED: "DISPATCH_CREATED",
      CARRIER_ASSIGNED: "DISPATCH_CARRIER_ASSIGNED",
      LOADING_PLANNED: "DISPATCH_LOADING_PLANNED",
      LOADED: "DISPATCH_LOADED",
      IN_TRANSIT: "DISPATCH_IN_TRANSIT",
      ARRIVED: "DISPATCH_ARRIVED",
      DELIVERED: "DISPATCH_DELIVERED",
    }
    await logEvent(
      orderId,
      companyId,
      userId,
      (eventMap[next] ?? "DISPATCH_STATUS_CHANGED") as LogisticOrderEventType,
      `Dispatch status: ${next.replace(/_/g, " ").toLowerCase()}`
    )
  }

  return { success: true, finalStatus: current }
}

export async function moveOrderToStage(
  orderId: string,
  targetStage: VehicleStage
): Promise<StageActionResult> {
  const { companyId, userId } = await authGate()

  if (!VEHICLE_STAGES.includes(targetStage)) {
    return { success: false, error: "Unknown target stage" }
  }

  const order = await loadOrder(orderId, companyId)
  if (!order) return { success: false, error: "Order not found" }

  switch (targetStage) {
    case "IN_PRODUCTION":
      await setYardReady(orderId, companyId, userId, false)
      break

    case "YARD":
      await setYardReady(orderId, companyId, userId, false)
      break

    case "WASH":
      await setYardReady(orderId, companyId, userId, false)
      await setMilestoneStatus(order, userId, "WASH", "IN_PROGRESS")
      await logEvent(orderId, companyId, userId, "MILESTONE_STARTED", "Washing started")
      break

    case "PDI":
      await setYardReady(orderId, companyId, userId, false)
      await setMilestoneStatus(order, userId, "WASH", "COMPLETED")
      await setMilestoneStatus(order, userId, "PDI", "IN_PROGRESS")
      await logEvent(orderId, companyId, userId, "MILESTONE_STARTED", "PDI started")
      break

    case "READY":
      await setMilestoneStatus(order, userId, "WASH", "COMPLETED")
      await setMilestoneStatus(order, userId, "PDI", "COMPLETED")
      await setYardReady(orderId, companyId, userId, true)
      await logEvent(orderId, companyId, userId, "YARD_READY_FOR_DISPATCH", "Marked ready for dispatch")
      break

    case "QUALITY_HOLD": {
      const active = order.milestones.find((m) => !TERMINAL_MILESTONE.includes(m.status))
      if (active) {
        await prisma.plantLogisticProductionMilestone.update({
          where: { id: active.id },
          data: { qualityHold: true, updatedById: userId, status: "QUALITY_HOLD" },
        })
        await logEvent(
          orderId,
          companyId,
          userId,
          "MILESTONE_QUALITY_HOLD",
          `${labelForGate(active.gate)} — quality hold`
        )
      }
      break
    }

    case "IN_TRANSIT": {
      await setYardReady(orderId, companyId, userId, false)
      const result = await advanceDispatchTo(orderId, companyId, userId, "IN_TRANSIT")
      revalidatePath("/logistic")
      revalidatePath("/logistic/orders")
      revalidatePath(`/logistic/orders/${orderId}`)
      return result
    }

    case "DELIVERED": {
      const result = await advanceDispatchTo(orderId, companyId, userId, "DELIVERED")
      revalidatePath("/logistic")
      revalidatePath("/logistic/orders")
      revalidatePath(`/logistic/orders/${orderId}`)
      return result
    }

    default:
      return { success: false, error: "Unsupported target stage" }
  }

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function requestDispatch(orderId: string): Promise<StageActionResult> {
  const { companyId, userId } = await authGate()
  const order = await loadOrder(orderId, companyId)
  if (!order) return { success: false, error: "Order not found" }

  const existing = await prisma.plantLogisticDispatch.findFirst({
    where: { orderId, companyId, status: { notIn: TERMINAL_DISPATCH } },
  })

  if (!existing) {
    await prisma.plantLogisticDispatch.create({
      data: { orderId, companyId, status: "NOT_PLANNED", createdById: userId },
    })
  }

  const result = await advanceDispatchTo(orderId, companyId, userId, "IN_TRANSIT")
  if (!result.success) return result

  await setYardReady(orderId, companyId, userId, false)

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}
