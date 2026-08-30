"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { DispatchStatus, DispatchTransportMode, LogisticOrderEventType, Role } from "@plantx/db/client"
import { canTransitionDispatch } from "@/lib/logistic/dispatch-status"
import { canDelivery } from "@/lib/logistic/roles"

const AUTH_CHECK = async () => {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")
  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  return { companyId: session.user.companyId, userId: session.user.id, role: session.user.role as Role }
}

function deliveryGate(role: Role): string | null {
  return canDelivery(role) ? null : "Bu işlem için yetkiniz yok"
}

export async function createOrUpdateDispatch(dispatchId: string | null, orderId: string, data: {
  dispatchBatchNo?: string | null
  carrierName?: string | null
  transportMode?: DispatchTransportMode
  destinationCountry?: string | null
  destinationCity?: string | null
  dealerOrDistributorName?: string | null
  trackingReference?: string | null
  notes?: string | null
  plannedLoadingDate?: string | null
  estimatedArrivalDate?: string | null
}) {
  const { companyId, userId, role } = await AUTH_CHECK()
  const gate = deliveryGate(role)
  if (gate) return { error: gate }

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id: orderId, companyId },
  })
  if (!order) return { error: "Order not found" }

  if (dispatchId) {
    const existing = await prisma.plantLogisticDispatch.findFirst({
      where: { id: dispatchId, companyId },
    })
    if (!existing) return { error: "Dispatch not found" }
    if (existing.orderId !== orderId) return { error: "Dispatch does not belong to this order" }

    await prisma.plantLogisticDispatch.update({
      where: { id: dispatchId },
      data: {
        dispatchBatchNo: data.dispatchBatchNo?.trim() || null,
        carrierName: data.carrierName?.trim() || null,
        transportMode: data.transportMode || existing.transportMode,
        destinationCountry: data.destinationCountry?.trim() || null,
        destinationCity: data.destinationCity?.trim() || null,
        dealerOrDistributorName: data.dealerOrDistributorName?.trim() || null,
        trackingReference: data.trackingReference?.trim() || null,
        notes: data.notes?.trim() || null,
        plannedLoadingDate: data.plannedLoadingDate ? new Date(data.plannedLoadingDate) : null,
        estimatedArrivalDate: data.estimatedArrivalDate ? new Date(data.estimatedArrivalDate) : null,
        updatedById: userId,
      },
    })
  } else {
    await prisma.plantLogisticDispatch.create({
      data: {
        orderId,
        companyId,
        dispatchBatchNo: data.dispatchBatchNo?.trim() || null,
        carrierName: data.carrierName?.trim() || null,
        transportMode: data.transportMode || "ROAD",
        status: "NOT_PLANNED",
        destinationCountry: data.destinationCountry?.trim() || null,
        destinationCity: data.destinationCity?.trim() || null,
        dealerOrDistributorName: data.dealerOrDistributorName?.trim() || null,
        trackingReference: data.trackingReference?.trim() || null,
        notes: data.notes?.trim() || null,
        plannedLoadingDate: data.plannedLoadingDate ? new Date(data.plannedLoadingDate) : null,
        estimatedArrivalDate: data.estimatedArrivalDate ? new Date(data.estimatedArrivalDate) : null,
        createdById: userId,
      },
    })
  }

  const action = dispatchId ? "updated" : "created"
  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "DISPATCH_CREATED",
      message: `Dispatch ${action}${data.dispatchBatchNo ? ` (${data.dispatchBatchNo})` : ""}`,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function assignCarrier(dispatchId: string, carrierName: string) {
  const { companyId, userId, role } = await AUTH_CHECK()
  const gate = deliveryGate(role)
  if (gate) return { error: gate }

  const dispatch = await prisma.plantLogisticDispatch.findFirst({
    where: { id: dispatchId, companyId },
  })
  if (!dispatch) return { error: "Dispatch not found" }

  const name = carrierName?.trim()
  if (!name) return { error: "Carrier name is required" }

  await prisma.plantLogisticDispatch.update({
    where: { id: dispatchId },
    data: { carrierName: name, updatedById: userId },
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId: dispatch.orderId,
      companyId,
      actorId: userId,
      eventType: "DISPATCH_CARRIER_ASSIGNED" as const,
      message: `Carrier assigned: ${name}`,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${dispatch.orderId}`)
  return { success: true }
}

export async function changeDispatchStatus(dispatchId: string, newStatus: DispatchStatus) {
  const { companyId, userId, role } = await AUTH_CHECK()
  const gate = deliveryGate(role)
  if (gate) return { error: gate }

  const dispatch = await prisma.plantLogisticDispatch.findFirst({
    where: { id: dispatchId, companyId },
  })
  if (!dispatch) return { error: "Dispatch not found" }

  if (!canTransitionDispatch(dispatch.status, newStatus)) {
    return { error: `Cannot transition from ${dispatch.status.replace(/_/g, " ")} to ${newStatus.replace(/_/g, " ")}` }
  }

  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedById: userId,
  }

  if (newStatus === "LOADED") updateData.actualLoadingDate = now
  if (newStatus === "ARRIVED") updateData.actualArrivalDate = now
  if (newStatus === "DELIVERED") updateData.deliveredAt = now

  await prisma.plantLogisticDispatch.update({
    where: { id: dispatchId },
    data: updateData,
  })

  const eventTypeMap: Record<string, string> = {
    PLANNED: "DISPATCH_CREATED",
    CARRIER_ASSIGNED: "DISPATCH_CARRIER_ASSIGNED",
    LOADING_PLANNED: "DISPATCH_LOADING_PLANNED",
    LOADED: "DISPATCH_LOADED",
    IN_TRANSIT: "DISPATCH_IN_TRANSIT",
    ARRIVED: "DISPATCH_ARRIVED",
    DELIVERED: "DISPATCH_DELIVERED",
    CANCELLED: "DISPATCH_CANCELLED",
  }
  const eventType = eventTypeMap[newStatus] || "DISPATCH_STATUS_CHANGED"

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId: dispatch.orderId,
      companyId,
      actorId: userId,
      eventType: eventType as LogisticOrderEventType,
      fromStatus: null,
      toStatus: null,
      message: `Dispatch status: ${newStatus.replace(/_/g, " ").toLowerCase()}${dispatch.dispatchBatchNo ? ` (${dispatch.dispatchBatchNo})` : ""}`,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${dispatch.orderId}`)
  return { success: true }
}

export async function updateDispatchDates(dispatchId: string, data: {
  plannedLoadingDate?: string | null
  estimatedArrivalDate?: string | null
}) {
  const { companyId, userId, role } = await AUTH_CHECK()
  const gate = deliveryGate(role)
  if (gate) return { error: gate }

  const dispatch = await prisma.plantLogisticDispatch.findFirst({
    where: { id: dispatchId, companyId },
  })
  if (!dispatch) return { error: "Dispatch not found" }

  await prisma.plantLogisticDispatch.update({
    where: { id: dispatchId },
    data: {
      plannedLoadingDate: data.plannedLoadingDate ? new Date(data.plannedLoadingDate) : null,
      estimatedArrivalDate: data.estimatedArrivalDate ? new Date(data.estimatedArrivalDate) : null,
      updatedById: userId,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${dispatch.orderId}`)
  return { success: true }
}

export async function markLoaded(dispatchId: string) {
  return changeDispatchStatus(dispatchId, "LOADED")
}

export async function markInTransit(dispatchId: string) {
  return changeDispatchStatus(dispatchId, "IN_TRANSIT")
}

export async function markArrived(dispatchId: string) {
  return changeDispatchStatus(dispatchId, "ARRIVED")
}

export async function markDelivered(dispatchId: string) {
  return changeDispatchStatus(dispatchId, "DELIVERED")
}