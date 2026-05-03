"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { calcRpn, calcRevisedRpn, validateSod, getMaxRpn, type FmeaRow } from "@/lib/fmea/types"
import type { FmeaStatus } from "@/generated/prisma/client"
import type { Prisma } from "@/generated/prisma/client"

function canManageFmea(session: { user: { companyType: string; role: string } } | null, type: "OEM" | "SUPPLIER"): boolean {
  if (!session) return false
  if (session.user.companyType !== type) return false
  return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
}

export async function saveFmeaRows(fmeaId: string, rows: FmeaRow[]) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManageFmea(session, "OEM") && !canManageFmea(session, "SUPPLIER")) {
    return { success: false, error: "Insufficient role" }
  }

  const requireFeature = (await import("@/lib/billing")).requireFeature
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
    for (const [field, value] of [["severity", row.severity], ["occurrence", row.occurrence], ["detection", row.detection]] as const) {
      const v = validateSod(value)
      if (!v.valid) return { success: false, error: `Invalid ${field}: ${v.error}` }
    }
    row.rpn = calcRpn(row.severity, row.occurrence, row.detection)
    const revisedRpn = calcRevisedRpn(row.revisedSeverity, row.revisedOccurrence, row.revisedDetection)
    if (revisedRpn != null) row.revisedRpn = revisedRpn
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

  return { success: true }
}

export async function submitFmeaForReview(fmeaId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "SUPPLIER") return { success: false, error: "Only supplier users can submit FMEA" }
  if (!canManageFmea(session, "SUPPLIER")) return { success: false, error: "Insufficient role" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, supplierId: session.user.companyId },
    include: { oem: { include: { users: { select: { id: true } } } } },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const submittableStatuses: FmeaStatus[] = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"]
  if (!submittableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA is not in a submittable status" }
  }

  const rows = (fmea.rows as FmeaRow[] | null) ?? []
  if (rows.length === 0) return { success: false, error: "Cannot submit FMEA with no rows" }

  for (const row of rows) {
    for (const [field, value] of [["severity", row.severity], ["occurrence", row.occurrence], ["detection", row.detection]] as const) {
      const v = validateSod(value)
      if (!v.valid) return { success: false, error: `Invalid ${field} in row "${row.failureMode || row.id}"` }
    }
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_SUBMITTED",
      actorId: session.user.id,
      metadata: { rowCount: rows.length, maxRpn: getMaxRpn(rows) },
    },
  })

  if (fmea.oem.users.length > 0) {
    await prisma.notification.createMany({
      data: fmea.oem.users.map(u => ({
        userId: u.id,
        companyId: fmea.oemId,
        message: `FMEA "${fmea.title}" submitted for review`,
        type: "FMEA_REVIEW_REQUESTED" as const,
        link: `/quality/oem/fmea/${fmeaId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath("/quality/supplier/fmea")
  revalidatePath(`/quality/oem/fmea/${fmeaId}`)
  revalidatePath("/quality/oem/fmea")
  revalidatePath("/quality/supplier")
  revalidatePath("/quality/oem")

  return { success: true }
}

export async function updateFmeaSupplierComment(fmeaId: string, rowId: string, supplierComment: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "SUPPLIER") return { success: false, error: "Only supplier users can add supplier comments" }
  if (!canManageFmea(session, "SUPPLIER")) return { success: false, error: "Insufficient role" }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, supplierId: session.user.companyId },
  })
  if (!fmea) return { success: false, error: "FMEA not found" }

  const editableStatuses: FmeaStatus[] = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"]
  if (!editableStatuses.includes(fmea.status as FmeaStatus)) {
    return { success: false, error: "FMEA is not in an editable status" }
  }

  const currentRows = (fmea.rows as FmeaRow[] | null) ?? []
  const rowIndex = currentRows.findIndex(r => r.id === rowId)
  if (rowIndex === -1) return { success: false, error: "Row not found" }

  currentRows[rowIndex].supplierComment = supplierComment

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { rows: currentRows as unknown as Prisma.InputJsonValue },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_UPDATED",
      actorId: session.user.id,
      metadata: { action: "supplier_comment_added", rowId },
    },
  })

  revalidatePath(`/quality/supplier/fmea/${fmeaId}`)
  revalidatePath(`/quality/oem/fmea/${fmeaId}`)

  return { success: true }
}