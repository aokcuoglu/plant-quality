"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function upsertYardStatus(orderId: string, data: {
  yardLocation?: string | null
  parkingSlot?: string | null
  notes?: string | null
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

  const existing = await prisma.plantLogisticYardStatus.findUnique({
    where: { orderId },
  })

  const yardLocation = data.yardLocation?.trim() || null
  const parkingSlot = data.parkingSlot?.trim() || null
  const notes = data.notes?.trim() || null

  if (existing) {
    await prisma.plantLogisticYardStatus.update({
      where: { orderId },
      data: { yardLocation, parkingSlot, notes, updatedById: userId },
    })
  } else {
    await prisma.plantLogisticYardStatus.create({
      data: {
        orderId,
        companyId,
        yardLocation,
        parkingSlot,
        notes,
        createdById: userId,
      },
    })
  }

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "YARD_STATUS_UPDATED",
      message: yardLocation
        ? `Yard location updated: ${yardLocation}${parkingSlot ? `, slot ${parkingSlot}` : ""}`
        : "Yard status updated",
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function markReadyForDispatch(orderId: string) {
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

  const existing = await prisma.plantLogisticYardStatus.findUnique({
    where: { orderId },
  })

  if (existing?.readyForDispatch) {
    return { error: "Order is already marked as ready for dispatch" }
  }
  if (existing?.blockedForDispatch) {
    return { error: "Cannot mark ready — order is blocked for dispatch. Unblock first." }
  }

  const now = new Date()
  if (existing) {
    await prisma.plantLogisticYardStatus.update({
      where: { orderId },
      data: {
        readyForDispatch: true,
        blockedForDispatch: false,
        blockReason: null,
        lastMovementAt: now,
        updatedById: userId,
      },
    })
  } else {
    await prisma.plantLogisticYardStatus.create({
      data: {
        orderId,
        companyId,
        readyForDispatch: true,
        lastMovementAt: now,
        createdById: userId,
      },
    })
  }

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "YARD_READY_FOR_DISPATCH",
      message: "Marked as ready for dispatch",
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function blockDispatch(orderId: string, blockReason: string) {
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

  const reason = blockReason?.trim()
  if (!reason) return { error: "Block reason is required" }

  const existing = await prisma.plantLogisticYardStatus.findUnique({
    where: { orderId },
  })

  if (existing?.blockedForDispatch) {
    return { error: "Order is already blocked for dispatch" }
  }

  const now = new Date()
  if (existing) {
    await prisma.plantLogisticYardStatus.update({
      where: { orderId },
      data: {
        readyForDispatch: false,
        blockedForDispatch: true,
        blockReason: reason,
        lastMovementAt: now,
        updatedById: userId,
      },
    })
  } else {
    await prisma.plantLogisticYardStatus.create({
      data: {
        orderId,
        companyId,
        readyForDispatch: false,
        blockedForDispatch: true,
        blockReason: reason,
        lastMovementAt: now,
        createdById: userId,
      },
    })
  }

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "YARD_BLOCKED",
      message: `Blocked for dispatch: ${reason}`,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function unblockDispatch(orderId: string) {
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

  const existing = await prisma.plantLogisticYardStatus.findUnique({
    where: { orderId },
  })
  if (!existing || !existing.blockedForDispatch) {
    return { error: "Order is not blocked for dispatch" }
  }

  const now = new Date()
  await prisma.plantLogisticYardStatus.update({
    where: { orderId },
    data: {
      blockedForDispatch: false,
      blockReason: null,
      lastMovementAt: now,
      updatedById: userId,
    },
  })

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "YARD_UNBLOCKED",
      message: "Unblocked for dispatch",
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}

export async function updateYardLocation(orderId: string, data: {
  yardLocation?: string | null
  parkingSlot?: string | null
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

  const yardLocation = data.yardLocation?.trim() || null
  const parkingSlot = data.parkingSlot?.trim() || null

  const existing = await prisma.plantLogisticYardStatus.findUnique({
    where: { orderId },
  })

  const now = new Date()
  if (existing) {
    await prisma.plantLogisticYardStatus.update({
      where: { orderId },
      data: { yardLocation, parkingSlot, lastMovementAt: now, updatedById: userId },
    })
  } else {
    await prisma.plantLogisticYardStatus.create({
      data: {
        orderId,
        companyId,
        yardLocation,
        parkingSlot,
        lastMovementAt: now,
        createdById: userId,
      },
    })
  }

  const parts: string[] = []
  if (yardLocation) parts.push(`Location: ${yardLocation}`)
  if (parkingSlot) parts.push(`Slot: ${parkingSlot}`)
  const msg = parts.length > 0 ? `Yard location updated — ${parts.join(", ")}` : "Yard location cleared"

  await prisma.plantLogisticOrderEvent.create({
    data: {
      orderId,
      companyId,
      actorId: userId,
      eventType: "YARD_STATUS_UPDATED",
      message: msg,
    },
  })

  revalidatePath("/logistic")
  revalidatePath("/logistic/orders")
  revalidatePath(`/logistic/orders/${orderId}`)
  return { success: true }
}