"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type {
  ProductionMilestoneGate,
  ProductionMilestoneStatus,
  LogisticOrderEventType,
} from "@/generated/prisma/client"
import { canTransitionMilestone } from "@/lib/logistic/milestone-status"

const DEFAULT_MILESTONES: {
  gate: ProductionMilestoneGate
  title: string
  sequence: number
}[] = [
  { gate: "BODY", title: "Body / Body Shop", sequence: 1 },
  { gate: "PAINT", title: "Paint", sequence: 2 },
  { gate: "ASSEMBLY", title: "Assembly", sequence: 3 },
  { gate: "ELECTRICAL", title: "Electrical", sequence: 4 },
  { gate: "POWERTRAIN", title: "Powertrain / Drivetrain", sequence: 5 },
  { gate: "EOL_TEST", title: "EOL Test", sequence: 6 },
  { gate: "PDI", title: "PDI", sequence: 7 },
  { gate: "FINAL_QUALITY", title: "Final Quality Gate", sequence: 8 },
  { gate: "YARD_READY", title: "Yard / Ready", sequence: 9 },
]

export async function seedDefaultMilestonesForOrder(orderId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const userId = session.user.id

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  const existing = await prisma.plantLogisticProductionMilestone.count({
    where: { orderId, companyId },
  })
  if (existing > 0) return { error: "Milestones already exist for this order" }

  await prisma.plantLogisticProductionMilestone.createMany({
    data: DEFAULT_MILESTONES.map((m) => ({
      orderId,
      companyId,
      sequence: m.sequence,
      gate: m.gate,
      title: m.title,
      status: "NOT_STARTED" as ProductionMilestoneStatus,
      createdById: userId,
    })),
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "MILESTONES_CREATED" as LogisticOrderEventType,
      message: "Production milestones created (9 default gates)",
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function createProductionMilestone(orderId: string, data: {
  gate: ProductionMilestoneGate
  title: string
  description?: string
  sequence?: number
  plannedStart?: string | null
  plannedFinish?: string | null
  responsibleDepartment?: string | null
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const userId = session.user.id

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  const maxSequence = await prisma.plantLogisticProductionMilestone.findFirst({
    where: { orderId, companyId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  })

  const sequence = data.sequence ?? (maxSequence ? maxSequence.sequence + 1 : 1)

  const milestone = await prisma.plantLogisticProductionMilestone.create({
    data: {
      orderId,
      companyId,
      sequence,
      gate: data.gate,
      title: data.title,
      description: data.description || null,
      status: "NOT_STARTED",
      plannedStart: data.plannedStart ? new Date(data.plannedStart) : null,
      plannedFinish: data.plannedFinish ? new Date(data.plannedFinish) : null,
      responsibleDepartment: data.responsibleDepartment || null,
      createdById: userId,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true, id: milestone.id }
}

export async function updateProductionMilestone(
  milestoneId: string,
  data: {
    title?: string
    description?: string
    plannedStart?: string | null
    plannedFinish?: string | null
    responsibleDepartment?: string | null
    delayReason?: string | null
    notes?: string | null
  }
) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const userId = session.user.id

  const milestone = await prisma.plantLogisticProductionMilestone.findFirst({
    where: { id: milestoneId, companyId },
  })
  if (!milestone) return { error: "Milestone not found" }

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: milestone.orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  await prisma.plantLogisticProductionMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.plannedStart !== undefined && { plannedStart: data.plannedStart ? new Date(data.plannedStart) : null }),
      ...(data.plannedFinish !== undefined && { plannedFinish: data.plannedFinish ? new Date(data.plannedFinish) : null }),
      ...(data.responsibleDepartment !== undefined && { responsibleDepartment: data.responsibleDepartment || null }),
      ...(data.delayReason !== undefined && { delayReason: data.delayReason || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      updatedById: userId,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${milestone.orderId}`)
  return { success: true }
}

export async function changeProductionMilestoneStatus(
  milestoneId: string,
  newStatus: ProductionMilestoneStatus
) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const userId = session.user.id

  const milestone = await prisma.plantLogisticProductionMilestone.findFirst({
    where: { id: milestoneId, companyId },
  })
  if (!milestone) return { error: "Milestone not found" }

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: milestone.orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  if (!canTransitionMilestone(milestone.status, newStatus)) {
    return { error: `Cannot transition from ${milestone.status} to ${newStatus}` }
  }

  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedById: userId,
  }

  if (newStatus === "IN_PROGRESS" && !milestone.actualStart) {
    updateData.actualStart = now
  }
  if (newStatus === "COMPLETED") {
    updateData.actualFinish = now
    if (!milestone.actualStart) {
      updateData.actualStart = now
    }
  }
  if (newStatus === "NOT_STARTED") {
    updateData.actualStart = null
    updateData.actualFinish = null
    updateData.qualityHold = false
    updateData.delayReason = null
  }
  if (newStatus === "QUALITY_HOLD") {
    updateData.qualityHold = true
  }
  if (newStatus === "IN_PROGRESS" && milestone.qualityHold) {
    updateData.qualityHold = false
    updateData.delayReason = null
  }

  await prisma.plantLogisticProductionMilestone.update({
    where: { id: milestoneId },
    data: updateData,
  })

  const eventTypeMap: Record<string, string> = {
    IN_PROGRESS: "MILESTONE_STARTED",
    COMPLETED: "MILESTONE_COMPLETED",
    BLOCKED: "MILESTONE_BLOCKED",
    QUALITY_HOLD: "MILESTONE_QUALITY_HOLD",
  }
  const eventType = eventTypeMap[newStatus]
  if (eventType) {
    await prisma.plantLogisticOrderEvent.create({
      data: {
        orderId: milestone.orderId,
        companyId,
        actorId: userId,
        eventType: eventType as LogisticOrderEventType,
        message: `${milestone.title} → ${newStatus.replace(/_/g, " ").toLowerCase()}`,
      },
    })
  }

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${milestone.orderId}`)
  return { success: true }
}

export async function deleteProductionMilestone(milestoneId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId

  const milestone = await prisma.plantLogisticProductionMilestone.findFirst({
    where: { id: milestoneId, companyId },
  })
  if (!milestone) return { error: "Milestone not found" }

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: milestone.orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  await prisma.plantLogisticProductionMilestone.delete({
    where: { id: milestoneId },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${milestone.orderId}`)
  return { success: true }
}