"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing/guards"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type {
  LogisticOrderCustomerType,
  LogisticOrderVehicleType,
  LogisticOrderPowertrain,
  LogisticOrderPriority,
  LogisticOrderStatus,
  LogisticOrderEventType,
} from "@/generated/prisma/client"
import { canTransitionTo } from "@/lib/logistic/status"

export async function createLogisticOrder(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const createdById = session.user.id

  const customerName = (formData.get("customerName") as string)?.trim()
  if (!customerName) {
    throw new Error("Customer name is required")
  }

  const vehicleModel = (formData.get("vehicleModel") as string)?.trim()
  if (!vehicleModel) {
    throw new Error("Vehicle model is required")
  }

  const quantity = parseInt(formData.get("quantity") as string, 10)
  if (!quantity || quantity < 1) {
    throw new Error("Quantity must be at least 1")
  }

  const requestNumber = (formData.get("requestNumber") as string)?.trim() || null
  const dealerName = (formData.get("dealerName") as string)?.trim() || null
  const distributorName = (formData.get("distributorName") as string)?.trim() || null
  const country = (formData.get("country") as string)?.trim() || null
  const market = (formData.get("market") as string)?.trim() || null
  const vehicleVariant = (formData.get("vehicleVariant") as string)?.trim() || null
  const notes = (formData.get("notes") as string)?.trim() || null
  const salesOrderNo = (formData.get("salesOrderNo") as string)?.trim() || null

  const customerType = (formData.get("customerType") as LogisticOrderCustomerType) || "CUSTOMER"
  const vehicleType = (formData.get("vehicleType") as LogisticOrderVehicleType) || "BUS"
  const powertrain = (formData.get("powertrain") as LogisticOrderPowertrain) || "DIESEL"
  const priority = (formData.get("priority") as LogisticOrderPriority) || "NORMAL"

  const requestedDeliveryDateStr = formData.get("requestedDeliveryDate") as string
  const requestedDeliveryDate = requestedDeliveryDateStr ? new Date(requestedDeliveryDateStr) : null

  const lastOrder = await prisma.plantLogisticOrder.findFirst({
    where: { companyId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })

  let orderNumber: string
  if (lastOrder) {
    const match = lastOrder.orderNumber.match(/LO-(\d+)$/)
    const next = match ? parseInt(match[1], 10) + 1 : 1
    orderNumber = `LO-${String(next).padStart(5, "0")}`
  } else {
    orderNumber = "LO-00001"
  }

  const order = await prisma.plantLogisticOrder.create({
    data: {
      companyId,
      orderNumber,
      requestNumber,
      customerName,
      customerType,
      dealerName,
      distributorName,
      country,
      market,
      vehicleModel,
      vehicleVariant,
      vehicleType,
      powertrain,
      quantity,
      priority,
      status: "DRAFT",
      requestedDeliveryDate,
      salesOrderNo,
      notes,
      createdById,
      events: {
        create: {
          companyId,
          actorId: createdById,
          eventType: "ORDER_CREATED" as LogisticOrderEventType,
          message: "Order created",
          fromStatus: null,
          toStatus: "DRAFT" as LogisticOrderStatus,
        },
      },
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  redirect(`/logistic/orders/${order.id}`)
}

export async function updateLogisticOrder(orderId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const updatedById = session.user.id

  const existing = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!existing) return { error: "Order not found" }

  const customerName = (formData.get("customerName") as string)?.trim()
  if (!customerName) return { error: "Customer name is required" }

  const vehicleModel = (formData.get("vehicleModel") as string)?.trim()
  if (!vehicleModel) return { error: "Vehicle model is required" }

  const quantity = parseInt(formData.get("quantity") as string, 10)
  if (!quantity || quantity < 1) return { error: "Quantity must be at least 1" }

  await prisma.plantLogisticOrder.update({
    where: { id: orderId },
    data: {
      customerName,
      customerType: (formData.get("customerType") as LogisticOrderCustomerType) || existing.customerType,
      dealerName: (formData.get("dealerName") as string)?.trim() || null,
      distributorName: (formData.get("distributorName") as string)?.trim() || null,
      country: (formData.get("country") as string)?.trim() || null,
      market: (formData.get("market") as string)?.trim() || null,
      vehicleModel,
      vehicleVariant: (formData.get("vehicleVariant") as string)?.trim() || null,
      vehicleType: (formData.get("vehicleType") as LogisticOrderVehicleType) || existing.vehicleType,
      powertrain: (formData.get("powertrain") as LogisticOrderPowertrain) || existing.powertrain,
      quantity,
      priority: (formData.get("priority") as LogisticOrderPriority) || existing.priority,
      requestNumber: (formData.get("requestNumber") as string)?.trim() || null,
      salesOrderNo: (formData.get("salesOrderNo") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      requestedDeliveryDate: formData.get("requestedDeliveryDate")
        ? new Date(formData.get("requestedDeliveryDate") as string)
        : null,
      updatedById,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function updateLogisticOrderPlanning(orderId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const updatedById = session.user.id

  const existing = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!existing) return { error: "Order not found" }

  const plannedProductionDateStr = formData.get("plannedProductionDate") as string
  const plannedDeliveryDateStr = formData.get("plannedDeliveryDate") as string
  const plannedProductionWeek = (formData.get("plannedProductionWeek") as string)?.trim() || null
  const productionOrderNo = (formData.get("productionOrderNo") as string)?.trim() || null

  await prisma.plantLogisticOrder.update({
    where: { id: orderId },
    data: {
      plannedProductionDate: plannedProductionDateStr ? new Date(plannedProductionDateStr) : null,
      plannedDeliveryDate: plannedDeliveryDateStr ? new Date(plannedDeliveryDateStr) : null,
      plannedProductionWeek,
      productionOrderNo,
      updatedById,
    },
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: updatedById,
      eventType: "PLANNING_UPDATED",
      message: "Production/delivery planning updated",
    },
  })

  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function assignVinChassis(orderId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const updatedById = session.user.id

  const existing = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!existing) return { error: "Order not found" }

  const vin = (formData.get("vin") as string)?.trim() || null
  const chassisNumber = (formData.get("chassisNumber") as string)?.trim() || null

  const updateData: Record<string, unknown> = { updatedById }
  const eventMessages: string[] = []

  if (vin !== existing.vin) {
    updateData.vin = vin
    eventMessages.push(vin ? `VIN assigned: ${vin}` : "VIN removed")
  }
  if (chassisNumber !== existing.chassisNumber) {
    updateData.chassisNumber = chassisNumber
    eventMessages.push(chassisNumber ? `Chassis assigned: ${chassisNumber}` : "Chassis number removed")
  }

  await prisma.plantLogisticOrder.update({
    where: { id: orderId },
    data: updateData,
  })

  for (const msg of eventMessages) {
    await prisma.plantLogisticOrderEvent.create({
      data: {
        orderId,
        companyId,
        actorId: updatedById,
        eventType: vin ? "VIN_ASSIGNED" : chassisNumber ? "CHASSIS_ASSIGNED" : "ORDER_UPDATED",
        message: msg,
      },
    })
  }

  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function changeLogisticOrderStatus(orderId: string, newStatus: LogisticOrderStatus) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const actorId = session.user.id

  const existing = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!existing) return { error: "Order not found" }

  if (!canTransitionTo(existing.status, newStatus)) {
    return { error: `Cannot transition from ${existing.status} to ${newStatus}` }
  }

  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedById: actorId,
  }

  if (newStatus === "APPROVED") updateData.approvedAt = now
  if (newStatus === "REJECTED") updateData.rejectedAt = now
  if (newStatus === "DELIVERED") updateData.deliveredAt = now
  if (newStatus === "CLOSED") updateData.closedAt = now

  await prisma.plantLogisticOrder.update({
    where: { id: orderId },
    data: updateData,
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId,
      eventType: "STATUS_CHANGED" as LogisticOrderEventType,
      fromStatus: existing.status,
      toStatus: newStatus,
      message: `Status changed from ${existing.status.replace(/_/g, " ")} to ${newStatus.replace(/_/g, " ")}`,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function addLogisticOrderComment(orderId: string, message: string) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const actorId = session.user.id

  const existing = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!existing) return { error: "Order not found" }

  const trimmed = message?.trim()
  if (!trimmed) return { error: "Comment cannot be empty" }

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId,
      eventType: "COMMENT_ADDED" as LogisticOrderEventType,
      message: trimmed,
    },
  })

  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}