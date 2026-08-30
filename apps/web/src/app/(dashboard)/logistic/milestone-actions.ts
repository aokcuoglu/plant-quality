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
} from "@plantx/db/client"
import { canTransitionMilestone } from "@/lib/logistic/milestone-status"
import { canProduction } from "@/lib/logistic/roles"
import { addCalendarDays } from "@/lib/sla"

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
  { gate: "WASH", title: "Washing", sequence: 7 },
  { gate: "PDI", title: "PDI", sequence: 8 },
  { gate: "FINAL_QUALITY", title: "Final Quality Gate", sequence: 9 },
  { gate: "YARD_READY", title: "Yard / Ready", sequence: 10 },
]

export async function seedDefaultMilestonesForOrder(orderId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  if (!canProduction(session.user.role)) return { error: "Bu işlem için yetkiniz yok" }

  const companyId = session.user.companyId
  const userId = session.user.id

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  const existing = await prisma.plantLogisticProductionMilestone.findMany({
    where: { orderId, companyId },
    select: { gate: true },
  })
  const existingGates = new Set(existing.map((m) => m.gate))
  const milestonesToCreate = DEFAULT_MILESTONES.filter((m) => !existingGates.has(m.gate))
  if (milestonesToCreate.length === 0) return { error: "All default milestones already exist for this order" }

  await prisma.plantLogisticProductionMilestone.createMany({
    data: milestonesToCreate.map((m) => ({
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
      message: `Production milestones created (${milestonesToCreate.length} default gates)`,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function createDefectFromQualityHold(milestoneId: string, supplierId: string, partNumber: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  if (!canProduction(session.user.role)) return { error: "Bu işlem için yetkiniz yok" }

  const companyId = session.user.companyId
  const userId = session.user.id

  const milestone = await prisma.plantLogisticProductionMilestone.findFirst({
    where: { id: milestoneId, companyId },
    include: { order: { select: { vehicleModel: true, vin: true, vehicleVariant: true } } },
  })
  if (!milestone) return { error: "Milestone not found" }

  if (milestone.linkedDefectId) {
    return { error: "A defect is already linked to this milestone" }
  }

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
  })
  if (!supplier) return { error: "Supplier not found" }

  const vehicleInfo = [
    milestone.order.vehicleModel,
    milestone.order.vehicleVariant ? `(${milestone.order.vehicleVariant})` : null,
    milestone.order.vin ? `VIN: ${milestone.order.vin}` : null,
  ].filter(Boolean).join(" ")

  const description = `[Quality Hold] ${milestone.title} — ${milestone.gate.replace(/_/g, " ")}\n\n${milestone.delayReason || "No delay reason recorded"}\n\nVehicle: ${vehicleInfo}\nLinked from logistic order`

  const defect = await prisma.defect.create({
    data: {
      oemId: companyId,
      supplierId,
      partNumber,
      description,
      status: "OPEN",
      oemOwnerId: userId,
      currentActionOwner: "SUPPLIER",
      supplierResponseDueAt: addCalendarDays(new Date(), 7),
    },
  })

  await prisma.eightDReport.create({
    data: {
      defectId: defect.id,
      d2_problem: milestone.delayReason || description,
    },
  })

  await prisma.plantLogisticProductionMilestone.update({
    where: { id: milestoneId },
    data: {
      linkedDefectId: defect.id,
      qualityHold: true,
    },
  })

  await prisma.defectEvent.create({
    data: {
      defectId: defect.id,
      type: "CREATED",
      actorId: userId,
      metadata: {
        source: "logistic_quality_hold",
        milestoneId,
        orderId: milestone.orderId,
        vehicleModel: milestone.order.vehicleModel,
        gate: milestone.gate,
      },
    },
  })

  await prisma.qualityRecordLink.create({
    data: {
      companyId,
      sourceType: "LOGISTIC_ORDER",
      sourceId: milestone.orderId,
      targetType: "DEFECT",
      targetId: defect.id,
      linkType: "ORDER_TO_DEFECT",
      reason: `Quality hold defect for milestone ${milestone.title}`,
      createdById: userId,
    },
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId: milestone.orderId,
      companyId,
      actorId: userId,
      eventType: "MILESTONE_QUALITY_HOLD" as LogisticOrderEventType,
      message: `Quality hold defect created for milestone ${milestone.title} — Defect ${defect.id}`,
    },
  })

  const supplierUsers = await prisma.user.findMany({
    where: { companyId: supplierId },
    select: { id: true },
  })
  if (supplierUsers.length > 0) {
    await prisma.notification.createMany({
      data: supplierUsers.map((user) => ({
        userId: user.id,
        companyId: supplierId,
        message: `New 8D defect created from quality hold: ${milestone.title} (${partNumber})`,
        type: "INFO" as const,
        link: `/quality/supplier/defects/${defect.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${milestone.orderId}`)
  revalidatePath("/quality/oem/defects")
  revalidatePath(`/quality/oem/defects/${defect.id}`)
  revalidatePath(`/quality/supplier/defects/${defect.id}`)
  revalidatePath("/quality/supplier/defects")

  return { success: true, defectId: defect.id }
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

  if (!canProduction(session.user.role)) return { error: "Bu işlem için yetkiniz yok" }

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

  if (data.plannedStart && data.plannedFinish && new Date(data.plannedStart) > new Date(data.plannedFinish)) {
    return { error: "Planned start date cannot be after planned finish date" }
  }

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

  if (!canProduction(session.user.role)) return { error: "Bu işlem için yetkiniz yok" }

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

  const isTerminal = ["COMPLETED", "SKIPPED", "CANCELLED"].includes(milestone.status)
  const allowedFields = isTerminal
    ? { notes: data.notes }
    : {
        title: data.title,
        description: data.description,
        plannedStart: data.plannedStart,
        plannedFinish: data.plannedFinish,
        responsibleDepartment: data.responsibleDepartment,
        delayReason: data.delayReason,
        notes: data.notes,
      }

  const effectivePlannedStart = allowedFields.plannedStart !== undefined
    ? (allowedFields.plannedStart ? new Date(allowedFields.plannedStart) : null)
    : milestone.plannedStart
  const effectivePlannedFinish = allowedFields.plannedFinish !== undefined
    ? (allowedFields.plannedFinish ? new Date(allowedFields.plannedFinish) : null)
    : milestone.plannedFinish

  if (effectivePlannedStart && effectivePlannedFinish && effectivePlannedStart > effectivePlannedFinish) {
    return { error: "Planned start date cannot be after planned finish date" }
  }

  if (isTerminal && (data.title !== undefined || data.description !== undefined || data.plannedStart !== undefined || data.plannedFinish !== undefined || data.responsibleDepartment !== undefined || data.delayReason !== undefined)) {
    return { error: "Cannot edit workflow fields on a terminal milestone. Only notes may be updated." }
  }

  await prisma.plantLogisticProductionMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(allowedFields.title !== undefined && { title: allowedFields.title }),
      ...(allowedFields.description !== undefined && { description: allowedFields.description || null }),
      ...(allowedFields.plannedStart !== undefined && { plannedStart: allowedFields.plannedStart ? new Date(allowedFields.plannedStart) : null }),
      ...(allowedFields.plannedFinish !== undefined && { plannedFinish: allowedFields.plannedFinish ? new Date(allowedFields.plannedFinish) : null }),
      ...(allowedFields.responsibleDepartment !== undefined && { responsibleDepartment: allowedFields.responsibleDepartment || null }),
      ...(allowedFields.delayReason !== undefined && { delayReason: allowedFields.delayReason || null }),
      ...(allowedFields.notes !== undefined && { notes: allowedFields.notes || null }),
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

  if (!canProduction(session.user.role)) return { error: "Bu işlem için yetkiniz yok" }

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
  if (newStatus === "IN_PROGRESS" && (milestone.qualityHold || milestone.status === "BLOCKED")) {
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
    CANCELLED: "STATUS_CHANGED",
    SKIPPED: "STATUS_CHANGED",
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

  if (!canProduction(session.user.role)) return { error: "Bu işlem için yetkiniz yok" }

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