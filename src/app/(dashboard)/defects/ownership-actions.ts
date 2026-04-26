"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

function isOemEditor(role: string) {
  return role === "ADMIN" || role === "QUALITY_ENGINEER"
}

function parseDateInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

async function logDefectEvent(
  defectId: string,
  type: "OWNER_CHANGED" | "SUPPLIER_ASSIGNEE_CHANGED" | "DUE_DATE_CHANGED",
  actorId: string,
  metadata: Record<string, unknown>,
) {
  await prisma.defectEvent.create({
    data: {
      defectId,
      type,
      actorId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  })
}

export async function updateDefectOwnershipAndSla(defectId: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false as const, error: "Unauthorized" }

  const defect = await prisma.defect.findFirst({
    where:
      session.user.companyType === "OEM"
        ? { id: defectId, oemId: session.user.companyId }
        : { id: defectId, supplierId: session.user.companyId },
    select: {
      id: true,
      oemId: true,
      supplierId: true,
      oemOwnerId: true,
      supplierAssigneeId: true,
      supplierResponseDueAt: true,
      eightDSubmissionDueAt: true,
      oemReviewDueAt: true,
      revisionDueAt: true,
    },
  })
  if (!defect) return { success: false as const, error: "Defect not found" }

  const updateData: {
    oemOwnerId?: string | null
    supplierAssigneeId?: string | null
    supplierResponseDueAt?: Date | null
    eightDSubmissionDueAt?: Date | null
    oemReviewDueAt?: Date | null
    revisionDueAt?: Date | null
  } = {}

  const eventPromises: Promise<unknown>[] = []
  const notificationData: { userId: string; companyId: string; message: string; type: "INFO"; link: string; isRead: false }[] = []

  if (session.user.companyType === "OEM") {
    if (!isOemEditor(session.user.role)) return { success: false as const, error: "Unauthorized" }

    const oemOwnerId = (formData.get("oemOwnerId") as string) || null
    const supplierAssigneeId = (formData.get("supplierAssigneeId") as string) || null

    if (oemOwnerId) {
      const owner = await prisma.user.findFirst({
        where: { id: oemOwnerId, companyId: defect.oemId },
        select: { id: true },
      })
      if (!owner) return { success: false as const, error: "OEM owner is invalid" }
      updateData.oemOwnerId = owner.id
    } else {
      updateData.oemOwnerId = null
    }

    if (supplierAssigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: supplierAssigneeId, companyId: defect.supplierId },
        select: { id: true },
      })
      if (!assignee) return { success: false as const, error: "Supplier assignee is invalid" }
      updateData.supplierAssigneeId = assignee.id
    } else {
      updateData.supplierAssigneeId = null
    }

    updateData.supplierResponseDueAt = parseDateInput(formData.get("supplierResponseDueAt"))
    updateData.eightDSubmissionDueAt = parseDateInput(formData.get("eightDSubmissionDueAt"))
    updateData.oemReviewDueAt = parseDateInput(formData.get("oemReviewDueAt"))
    updateData.revisionDueAt = parseDateInput(formData.get("revisionDueAt"))
  } else if (session.user.companyType === "SUPPLIER") {
    const supplierAssigneeId = (formData.get("supplierAssigneeId") as string) || null

    if (session.user.role === "ADMIN") {
      if (supplierAssigneeId) {
        const assignee = await prisma.user.findFirst({
          where: { id: supplierAssigneeId, companyId: defect.supplierId },
          select: { id: true },
        })
        if (!assignee) return { success: false as const, error: "Supplier assignee is invalid" }
        updateData.supplierAssigneeId = assignee.id
      } else {
        updateData.supplierAssigneeId = null
      }
    } else if (session.user.role === "QUALITY_ENGINEER") {
      if (defect.supplierAssigneeId) {
        return { success: false as const, error: "This defect is already assigned" }
      }
      updateData.supplierAssigneeId = session.user.id
    } else {
      return { success: false as const, error: "Unauthorized" }
    }
  }

  await prisma.defect.update({
    where: { id: defectId },
    data: updateData,
  })

  if ("oemOwnerId" in updateData && updateData.oemOwnerId !== defect.oemOwnerId) {
    eventPromises.push(logDefectEvent(defectId, "OWNER_CHANGED", session.user.id, {
      previousOwnerId: defect.oemOwnerId,
      nextOwnerId: updateData.oemOwnerId,
    }))
    if (updateData.oemOwnerId) {
      notificationData.push({
        userId: updateData.oemOwnerId,
        companyId: defect.oemId,
        message: "You were assigned as OEM owner for a defect",
        type: "INFO",
        link: `/quality/oem/defects/${defectId}`,
        isRead: false,
      })
    }
  }

  if ("supplierAssigneeId" in updateData && updateData.supplierAssigneeId !== defect.supplierAssigneeId) {
    eventPromises.push(logDefectEvent(defectId, "SUPPLIER_ASSIGNEE_CHANGED", session.user.id, {
      previousAssigneeId: defect.supplierAssigneeId,
      nextAssigneeId: updateData.supplierAssigneeId,
    }))
    if (updateData.supplierAssigneeId) {
      notificationData.push({
        userId: updateData.supplierAssigneeId,
        companyId: defect.supplierId,
        message: "You were assigned to a supplier quality defect",
        type: "INFO",
        link: `/quality/supplier/defects/${defectId}`,
        isRead: false,
      })
    }
  }

  const dueDateKeys = ["supplierResponseDueAt", "eightDSubmissionDueAt", "oemReviewDueAt", "revisionDueAt"] as const
  const changedDueDates = dueDateKeys.filter((key) =>
    key in updateData && updateData[key]?.getTime() !== defect[key]?.getTime(),
  )
  if (changedDueDates.length > 0) {
    eventPromises.push(logDefectEvent(defectId, "DUE_DATE_CHANGED", session.user.id, {
      changedDueDates,
    }))
    const affectedUsers = [updateData.oemOwnerId ?? defect.oemOwnerId, updateData.supplierAssigneeId ?? defect.supplierAssigneeId].filter(Boolean) as string[]
    for (const userId of new Set(affectedUsers)) {
      notificationData.push({
        userId,
        companyId: userId === (updateData.oemOwnerId ?? defect.oemOwnerId) ? defect.oemId : (defect.supplierId ?? session.user.companyId),
        message: "SLA due dates were updated for a defect",
        type: "INFO",
        link: userId === (updateData.oemOwnerId ?? defect.oemOwnerId) ? `/quality/oem/defects/${defectId}` : `/quality/supplier/defects/${defectId}`,
        isRead: false,
      })
    }
  }

  await Promise.all([
    ...eventPromises,
    notificationData.length > 0 ? prisma.notification.createMany({ data: notificationData }) : Promise.resolve(),
  ])

  revalidatePath(`/quality/oem/defects/${defectId}`)
  revalidatePath(`/quality/supplier/defects/${defectId}`)
  revalidatePath("/quality/oem/defects")
  revalidatePath("/quality/supplier/defects")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true as const }
}
