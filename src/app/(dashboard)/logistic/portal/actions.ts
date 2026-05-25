"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isDealerUser, isDistributorUser, isPortalUser, isOemUser } from "@/lib/logistic/portal-access"
import { getExternalOrderStatus } from "@/lib/logistic/external-status"
import type { ExternalOrderStatus } from "@/lib/logistic/external-status"
import { revalidatePath } from "next/cache"

const AUTH_ERROR = "Authentication required"
const ACCESS_ERROR = "Access denied"
const NOT_FOUND = "Order not found"

export async function getPortalOrders() {
  const session = await auth()
  if (!session?.user) return { error: AUTH_ERROR }

  const { companyId, companyType } = session.user
  if (!isPortalUser(companyType)) return { error: NOT_FOUND }

  const where = {
    externalVisible: true,
    ...(isDealerUser(companyType)
      ? { dealerCompanyId: companyId }
      : { distributorCompanyId: companyId }),
  }

  const orders = await prisma.plantLogisticOrder.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerType: true,
      dealerName: true,
      distributorName: true,
      vehicleModel: true,
      vehicleVariant: true,
      vehicleType: true,
      powertrain: true,
      quantity: true,
      priority: true,
      status: true,
      plannedDeliveryDate: true,
      country: true,
      market: true,
      externalStatus: true,
      externalStatusNote: true,
      updatedAt: true,
      dispatches: {
        select: {
          status: true,
          estimatedArrivalDate: true,
          destinationCountry: true,
          destinationCity: true,
          carrierName: true,
          transportMode: true,
          trackingReference: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const result = orders.map((order) => {
    const latestDispatch = order.dispatches[0]
    const externalStatus = getExternalOrderStatus(order.status, order.externalStatus, latestDispatch?.status ?? null)

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerType: order.customerType,
      dealerName: order.dealerName,
      distributorName: order.distributorName,
      vehicleModel: order.vehicleModel,
      vehicleVariant: order.vehicleVariant,
      vehicleType: order.vehicleType,
      powertrain: order.powertrain,
      quantity: order.quantity,
      priority: order.priority,
      externalStatus,
      plannedDeliveryDate: order.plannedDeliveryDate,
      country: order.country,
      market: order.market,
      externalStatusNote: order.externalStatusNote,
      latestDispatch: latestDispatch
        ? {
            status: latestDispatch.status,
            estimatedArrivalDate: latestDispatch.estimatedArrivalDate,
            destinationCountry: latestDispatch.destinationCountry,
            destinationCity: latestDispatch.destinationCity,
            carrierName: latestDispatch.carrierName,
            transportMode: latestDispatch.transportMode,
            trackingReference: latestDispatch.trackingReference,
          }
        : null,
      updatedAt: order.updatedAt,
    }
  })

  return { data: result }
}

export async function getPortalOrderDetail(orderId: string) {
  const session = await auth()
  if (!session?.user) return { error: AUTH_ERROR }

  const { companyId, companyType } = session.user
  if (!isPortalUser(companyType)) return { error: NOT_FOUND }

  const where: Record<string, unknown> = {
    id: orderId,
    externalVisible: true,
  }

  if (isDealerUser(companyType)) {
    where.dealerCompanyId = companyId
  } else if (isDistributorUser(companyType)) {
    where.distributorCompanyId = companyId
  }

  const order = await prisma.plantLogisticOrder.findFirst({
    where,
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerType: true,
      dealerName: true,
      distributorName: true,
      vehicleModel: true,
      vehicleVariant: true,
      vehicleType: true,
      powertrain: true,
      quantity: true,
      priority: true,
      status: true,
      plannedDeliveryDate: true,
      country: true,
      market: true,
      externalStatus: true,
      externalStatusNote: true,
      createdAt: true,
      updatedAt: true,
      dispatches: {
        select: {
          id: true,
          dispatchBatchNo: true,
          status: true,
          transportMode: true,
          carrierName: true,
          plannedLoadingDate: true,
          actualLoadingDate: true,
          estimatedArrivalDate: true,
          actualArrivalDate: true,
          destinationCountry: true,
          destinationCity: true,
          trackingReference: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!order) return { error: NOT_FOUND }

  const latestDispatch = order.dispatches[0]
  const externalStatus = getExternalOrderStatus(order.status, order.externalStatus, latestDispatch?.status ?? null)

  return {
    data: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerType: order.customerType,
      dealerName: order.dealerName,
      distributorName: order.distributorName,
      vehicleModel: order.vehicleModel,
      vehicleVariant: order.vehicleVariant,
      vehicleType: order.vehicleType,
      powertrain: order.powertrain,
      quantity: order.quantity,
      priority: order.priority,
      status: order.status,
      externalStatus,
      plannedDeliveryDate: order.plannedDeliveryDate,
      country: order.country,
      market: order.market,
      externalStatusNote: order.externalStatusNote,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      dispatches: order.dispatches,
    },
  }
}

export async function getPortalOrderTimeline(orderId: string) {
  const session = await auth()
  if (!session?.user) return { error: AUTH_ERROR }

  const { companyId, companyType } = session.user
  if (!isPortalUser(companyType)) return { error: NOT_FOUND }

  const where: Record<string, unknown> = {
    id: orderId,
    externalVisible: true,
  }

  if (isDealerUser(companyType)) {
    where.dealerCompanyId = companyId
  } else if (isDistributorUser(companyType)) {
    where.distributorCompanyId = companyId
  }

  const order = await prisma.plantLogisticOrder.findFirst({
    where,
    select: { id: true },
  })

  if (!order) return { error: NOT_FOUND }

  const externalEventTypes = new Set([
    "STATUS_CHANGED",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "DISPATCH_CREATED",
    "DISPATCH_STATUS_CHANGED",
    "DISPATCH_DELIVERED",
  ])

  const events = await prisma.plantLogisticOrderEvent.findMany({
    where: { orderId },
    select: {
      id: true,
      eventType: true,
      fromStatus: true,
      toStatus: true,
      message: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const filtered = events.filter((e) => {
    if (externalEventTypes.has(e.eventType)) return true
    if (e.eventType === "ORDER_CREATED") return true
    if (e.eventType === "MILESTONES_CREATED") return false
    if (e.eventType.startsWith("YARD_")) return false
    if (e.eventType.startsWith("MILESTONE_")) return false
    if (e.eventType === "COMMENT_ADDED") return false
    return false
  })

  return {
    data: filtered.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      message: e.message,
      createdAt: e.createdAt,
    })),
  }
}

export async function getPortalDashboardStats() {
  const session = await auth()
  if (!session?.user) return { error: AUTH_ERROR }

  const { companyId, companyType } = session.user
  if (!isPortalUser(companyType)) return { error: NOT_FOUND }

  const where = {
    externalVisible: true,
    ...(isDealerUser(companyType)
      ? { dealerCompanyId: companyId }
      : { distributorCompanyId: companyId }),
  }

  const orders = await prisma.plantLogisticOrder.findMany({
    where,
    select: {
      id: true,
      status: true,
      externalStatus: true,
      dispatches: {
        select: { status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  let total = 0
  let inProduction = 0
  let readyForDispatch = 0
  let inTransit = 0
  let delivered = 0

  for (const order of orders) {
    total++
    const es = getExternalOrderStatus(order.status, order.externalStatus, order.dispatches[0]?.status ?? null)
    switch (es) {
      case "IN_PRODUCTION":
        inProduction++
        break
      case "READY_FOR_DISPATCH":
        readyForDispatch++
        break
      case "DISPATCHED":
      case "IN_TRANSIT":
        inTransit++
        break
      case "DELIVERED":
        delivered++
        break
      default:
        break
    }
  }

  return {
    data: {
      total,
      inProduction,
      readyForDispatch,
      inTransit,
      delivered,
    },
  }
}

export async function updateOrderExternalVisibility(
  orderId: string,
  data: {
    externalVisible: boolean
    dealerCompanyId?: string | null
    distributorCompanyId?: string | null
    externalStatus?: ExternalOrderStatus | null
    externalStatusNote?: string | null
  }
) {
  const session = await auth()
  if (!session?.user) return { error: AUTH_ERROR }

  const { companyId, companyType } = session.user
  if (!isOemUser(companyType)) return { error: ACCESS_ERROR }

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })

  if (!order) return { error: NOT_FOUND }

  const updated = await prisma.plantLogisticOrder.update({
    where: { id: orderId },
    data: {
      externalVisible: data.externalVisible,
      dealerCompanyId: data.dealerCompanyId ?? null,
      distributorCompanyId: data.distributorCompanyId ?? null,
      externalStatus: data.externalStatus ?? null,
      externalStatusNote: data.externalStatusNote ?? null,
    },
  })

  return { data: { id: updated.id, externalVisible: updated.externalVisible } }
}

export async function createPortalOrder(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: AUTH_ERROR }

  const { companyId, companyType } = session.user
  if (!isPortalUser(companyType)) return { error: ACCESS_ERROR }

  const oemId = formData.get("oemId") as string | null
  const customerName = formData.get("customerName") as string | null
  const vehicleModel = formData.get("vehicleModel") as string | null
  const vehicleType = formData.get("vehicleType") as string | null
  const quantityStr = formData.get("quantity") as string | null
  const priority = (formData.get("priority") as string) || "NORMAL"
  const country = formData.get("country") as string | null
  const market = formData.get("market") as string | null
  const vehicleVariant = formData.get("vehicleVariant") as string | null
  const powertrain = (formData.get("powertrain") as string) || null
  const requestedDeliveryDate = formData.get("requestedDeliveryDate") as string | null
  const notes = (formData.get("notes") as string) || null

  if (!oemId || !customerName || !vehicleModel || !vehicleType || !quantityStr) {
    return { error: "Required fields missing: OEM, customer name, vehicle model, vehicle type, quantity" }
  }

  const quantity = parseInt(quantityStr, 10)
  if (isNaN(quantity) || quantity < 1) return { error: "Quantity must be a positive number" }

  const oem = await prisma.company.findFirst({
    where: { id: oemId, type: "OEM" },
    select: { id: true },
  })
  if (!oem) return { error: "Selected OEM not found" }

  const last = await prisma.plantLogisticOrder.findFirst({
    where: { companyId: oem.id },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })
  const lastNum = last ? parseInt(last.orderNumber.replace("LO-", ""), 10) : 0
  const orderNumber = `LO-${String(lastNum + 1).padStart(5, "0")}`

  const order = await prisma.plantLogisticOrder.create({
    data: {
      companyId: oem.id,
      orderNumber,
      customerName,
      customerType: "CUSTOMER",
      vehicleModel,
      vehicleType: vehicleType as "BUS",
      quantity,
      priority: priority as "NORMAL",
      status: "DRAFT",
      dealerCompanyId: companyId,
      dealerName: session.user.companyName ?? null,
      externalVisible: false,
      country: country || null,
      market: market || null,
      vehicleVariant: vehicleVariant || null,
      powertrain: powertrain as "DIESEL" | null,
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
      notes,
      createdById: session.user.id,
    },
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId: order.id,
      companyId: oem.id,
      actorId: session.user.id,
      eventType: "ORDER_CREATED",
      message: `Order created by dealer ${session.user.companyName}`,
    },
  })

  revalidatePath("/logistic/portal")
  revalidatePath("/logistic/portal/orders")
  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")

  return { data: { id: order.id, orderNumber: order.orderNumber } }
}