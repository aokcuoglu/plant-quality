"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { revalidatePath } from "next/cache"
import { generateFmeaNumber } from "@/lib/fmea"
import { calcRpn, calcRevisedRpn, validateSod, getMaxRpn, type FmeaRow } from "@/lib/fmea/types"
import type { FmeaStatus, FmeaType } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

function canManageFmea(session: { user: { companyType: string; role: string } } | null, type: "OEM" | "SUPPLIER"): boolean {
  if (!session) return false
  if (session.user.companyType !== type) return false
  return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
}

export async function createFmea(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can create FMEA requests" }
  if (!canManageFmea(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  const fmeaType = (formData.get("fmeaType") as FmeaType) || "PROCESS"
  const supplierId = (formData.get("supplierId") as string) || null
  const partNumber = formData.get("partNumber") as string
  const partName = (formData.get("partName") as string) || null
  const processName = (formData.get("processName") as string) || null
  const projectName = (formData.get("projectName") as string) || null
  const vehicleModel = (formData.get("vehicleModel") as string) || null
  const revision = (formData.get("revision") as string) || null
  const title = formData.get("title") as string
  const dueDateStr = formData.get("dueDate") as string | null
  const notes = (formData.get("notes") as string) || null

  if (!partNumber || !title) {
    return { success: false, error: "Title and part number are required" }
  }

  if (supplierId) {
    const supplier = await prisma.company.findFirst({
      where: { id: supplierId, type: "SUPPLIER" },
    })
    if (!supplier) return { success: false, error: "Invalid supplier" }
  }

  const fmeaNumber = generateFmeaNumber()
  const status: FmeaStatus = supplierId ? "REQUESTED" : "DRAFT"

  const fmea = await prisma.fmea.create({
    data: {
      fmeaNumber,
      title,
      fmeaType,
      partNumber,
      partName,
      processName,
      projectName,
      vehicleModel,
      revision,
      status,
      oemId: session.user.companyId,
      supplierId,
      responsibleId: session.user.id,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      notes,
      createdById: session.user.id,
      rows: [],
    },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId: fmea.id,
      type: "FMEA_CREATED",
      actorId: session.user.id,
      metadata: { title, partNumber, fmeaType, status },
    },
  })

  if (supplierId && status === "REQUESTED") {
    const supplier = await prisma.company.findUnique({
      where: { id: supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map(u => ({
          userId: u.id,
          companyId: supplierId,
          message: `New FMEA request: "${title}" (${fmeaType === "DESIGN" ? "DFMEA" : "PFMEA"})`,
          type: "FMEA_REVIEW_REQUESTED" as const,
          link: `/quality/supplier/fmea/${fmea.id}`,
          isRead: false,
        })),
      })
    }
  }

  revalidatePath("/quality/oem/fmea")
  revalidatePath("/quality/oem")
  if (supplierId) {
    revalidatePath("/quality/supplier/fmea")
    revalidatePath("/quality/supplier")
  }

  return { success: true, id: fmea.id }
}

export async function saveFmeaRows(fmeaId: string, rows: FmeaRow[]) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManageFmea(session, "OEM") && !canManageFmea(session, "SUPPLIER")) {
    return { success: false, error: "Insufficient role" }
  }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  const fmea = await prisma.fmea.findFirst({
    where: {
      id: fmeaId,
      ...(session.user.companyType === "OEM"
        ? { oemId: session.user.companyId }
        : { supplierId: session.user.companyId }),
    },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const editableStatuses: FmeaStatus[] = session.user.companyType === "OEM"
    ? ["DRAFT", "REQUESTED"]
    : ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"]
  if (!editableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA is not in an editable status" }
  }

  for (const row of rows) {
    if (!row.failureMode?.trim()) return { success: false, error: `Row "${row.id}" is missing a failure mode` }
    for (const [field, value] of [["severity", row.severity], ["occurrence", row.occurrence], ["detection", row.detection]] as const) {
      const v = validateSod(value)
      if (!v.valid) return { success: false, error: `Invalid ${field}: ${v.error}` }
    }
    if (row.revisedSeverity != null) {
      const v = validateSod(row.revisedSeverity)
      if (!v.valid) return { success: false, error: `Invalid revisedSeverity: ${v.error}` }
    }
    if (row.revisedOccurrence != null) {
      const v = validateSod(row.revisedOccurrence)
      if (!v.valid) return { success: false, error: `Invalid revisedOccurrence: ${v.error}` }
    }
    if (row.revisedDetection != null) {
      const v = validateSod(row.revisedDetection)
      if (!v.valid) return { success: false, error: `Invalid revisedDetection: ${v.error}` }
    }
    row.rpn = calcRpn(row.severity, row.occurrence, row.detection)
    const revisedRpn = calcRevisedRpn(row.revisedSeverity, row.revisedOccurrence, row.revisedDetection)
    if (revisedRpn != null) row.revisedRpn = revisedRpn
    else if (row.revisedSeverity != null || row.revisedOccurrence != null || row.revisedDetection != null) {
      row.revisedRpn = undefined
    }
  }

  if (session.user.companyType === "SUPPLIER" && fmea.status === "REQUESTED") {
    await prisma.fmea.update({
      where: { id: fmeaId },
      data: { status: "SUPPLIER_IN_PROGRESS", rows: rows as unknown as Prisma.InputJsonValue },
    })
  } else {
    await prisma.fmea.update({
      where: { id: fmeaId },
      data: { rows: rows as unknown as Prisma.InputJsonValue },
    })
  }

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_UPDATED",
      actorId: session.user.id,
      metadata: { rowCount: rows.length, maxRpn: getMaxRpn(rows) },
    },
  })

  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function approveFmea(fmeaId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can approve FMEA" }
  if (!canManageFmea(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, oemId: session.user.companyId },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const reviewableStatuses: FmeaStatus[] = ["SUBMITTED", "UNDER_REVIEW"]
  if (!reviewableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA is not in a reviewable status" }
  }

  const rows = (fmea.rows as FmeaRow[] | null) ?? []
  if (rows.length === 0) return { success: false, error: "Cannot approve FMEA with no rows" }

  for (const row of rows) {
    for (const [field, value] of [["severity", row.severity], ["occurrence", row.occurrence], ["detection", row.detection]] as const) {
      const v = validateSod(value)
      if (!v.valid) return { success: false, error: `Invalid ${field} in row "${row.failureMode || row.id}": ${v.error}` }
    }
    if (row.revisedSeverity != null) {
      const v = validateSod(row.revisedSeverity)
      if (!v.valid) return { success: false, error: `Invalid revisedSeverity in row "${row.failureMode || row.id}": ${v.error}` }
    }
    if (row.revisedOccurrence != null) {
      const v = validateSod(row.revisedOccurrence)
      if (!v.valid) return { success: false, error: `Invalid revisedOccurrence in row "${row.failureMode || row.id}": ${v.error}` }
    }
    if (row.revisedDetection != null) {
      const v = validateSod(row.revisedDetection)
      if (!v.valid) return { success: false, error: `Invalid revisedDetection in row "${row.failureMode || row.id}": ${v.error}` }
    }
  }

  const hasHighRpn = rows.some(r => (r.rpn ?? 0) >= 200)

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedById: session.user.id, reviewedAt: new Date(), reviewedById: session.user.id },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_APPROVED",
      actorId: session.user.id,
      metadata: { title: fmea.title, maxRpn: getMaxRpn(rows) },
    },
  })

  if (fmea.supplierId) {
    const supplier = await prisma.company.findUnique({
      where: { id: fmea.supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map(u => ({
          userId: u.id,
          companyId: fmea.supplierId!,
          message: `FMEA "${fmea.title}" approved`,
          type: "FMEA_STATUS_CHANGED" as const,
          link: `/quality/supplier/fmea/${fmeaId}`,
          isRead: false,
        })),
      })

      if (hasHighRpn) {
        const highRpnRows = rows.filter(r => (r.rpn ?? 0) >= 200)
        await prisma.notification.createMany({
          data: supplier.users.map(u => ({
            userId: u.id,
            companyId: fmea.supplierId!,
            message: `FMEA "${fmea.title}" has ${highRpnRows.length} high-RPN items (RPN >= 200)`,
            type: "FMEA_HIGH_RPN" as const,
            link: `/quality/supplier/fmea/${fmeaId}`,
            isRead: false,
          })),
        })
      }
    }
  }

  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function rejectFmea(fmeaId: string, reason: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can reject FMEA" }
  if (!canManageFmea(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  if (!reason?.trim()) return { success: false, error: "Rejection reason is required" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, oemId: session.user.companyId },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const reviewableStatuses: FmeaStatus[] = ["SUBMITTED", "UNDER_REVIEW"]
  if (!reviewableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA is not in a reviewable status" }
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: session.user.id, rejectionReason: reason },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_REJECTED",
      actorId: session.user.id,
      metadata: { reason },
    },
  })

  if (fmea.supplierId) {
    const supplier = await prisma.company.findUnique({
      where: { id: fmea.supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map(u => ({
          userId: u.id,
          companyId: fmea.supplierId!,
          message: `FMEA "${fmea.title}" rejected`,
          type: "FMEA_STATUS_CHANGED" as const,
          link: `/quality/supplier/fmea/${fmeaId}`,
          isRead: false,
        })),
      })
    }
  }

  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function requestFmeaRevision(fmeaId: string, reason: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can request FMEA revision" }
  if (!canManageFmea(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  if (!reason?.trim()) return { success: false, error: "Revision reason is required" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, oemId: session.user.companyId },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const reviewableStatuses: FmeaStatus[] = ["SUBMITTED", "UNDER_REVIEW"]
  if (!reviewableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA is not in a reviewable status" }
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { status: "REVISION_REQUIRED", reviewedAt: new Date(), reviewedById: session.user.id, notes: fmea.notes ? `${fmea.notes}\n\nRevision requested: ${reason}` : `Revision requested: ${reason}` },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_REVISION_REQUESTED",
      actorId: session.user.id,
      metadata: { reason },
    },
  })

  if (fmea.supplierId) {
    const supplier = await prisma.company.findUnique({
      where: { id: fmea.supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map(u => ({
          userId: u.id,
          companyId: fmea.supplierId!,
          message: `Revision requested for FMEA "${fmea.title}"`,
          type: "FMEA_STATUS_CHANGED" as const,
          link: `/quality/supplier/fmea/${fmeaId}`,
          isRead: false,
        })),
      })
    }
  }

  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function cancelFmea(fmeaId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can cancel FMEA" }
  if (!canManageFmea(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, oemId: session.user.companyId },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const cancellableStatuses: FmeaStatus[] = ["DRAFT", "REQUESTED", "SUPPLIER_IN_PROGRESS"]
  if (!cancellableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA cannot be cancelled in this status" }
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { status: "CANCELLED" },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_CANCELLED",
      actorId: session.user.id,
      metadata: {},
    },
  })

  if (fmea.supplierId) {
    const supplier = await prisma.company.findUnique({
      where: { id: fmea.supplierId },
      include: { users: { select: { id: true } } },
    })
    if (supplier && supplier.users.length > 0) {
      await prisma.notification.createMany({
        data: supplier.users.map(u => ({
          userId: u.id,
          companyId: fmea.supplierId!,
          message: `FMEA "${fmea.title}" has been cancelled`,
          type: "INFO" as const,
          link: `/quality/supplier/fmea/${fmeaId}`,
          isRead: false,
        })),
      })
    }
  }

  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}

export async function updateFmeaOemComment(fmeaId: string, rowId: string, oemComment: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can add OEM comments" }
  if (!canManageFmea(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "FMEA")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "FMEA requires a higher plan" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, oemId: session.user.companyId },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const currentRows = (fmea.rows as FmeaRow[] | null) ?? []
  const rowIndex = currentRows.findIndex(r => r.id === rowId)
  if (rowIndex === -1) return { success: false, error: "Row not found" }

  currentRows[rowIndex].oemComment = oemComment

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { rows: currentRows as unknown as Prisma.InputJsonValue },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_UPDATED",
      actorId: session.user.id,
      metadata: { action: "oem_comment_added", rowId },
    },
  })

  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath("/quality/oem")
  revalidatePath("/quality/supplier")

  return { success: true }
}