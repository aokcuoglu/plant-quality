"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { FmeaType } from "@/generated/prisma/client"

interface FmeaRow {
  id: string
  processStep?: string
  potentialFailureMode: string
  potentialEffect: string
  severity: number
  potentialCause: string
  occurrence: number
  currentControl: string
  detection: number
  rpn: number
  recommendedAction?: string
  responsibleId?: string
  targetDate?: string
  actionTaken?: string
  revisedSeverity?: number
  revisedOccurrence?: number
  revisedDetection?: number
  revisedRpn?: number
}

export async function createFmea(formData: FormData) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return
  }

  const supplierId = formData.get("supplierId") as string
  const title = formData.get("title") as string
  const partNumber = formData.get("partNumber") as string
  const partName = (formData.get("partName") as string) || null
  const fmeaType = (formData.get("fmeaType") as FmeaType) || "PROCESS"
  const processStep = (formData.get("processStep") as string) || null
  const defectId = (formData.get("defectId") as string) || null

  if (!supplierId || !title || !partNumber) return

  const fmea = await prisma.fmea.create({
    data: {
      title,
      fmeaType,
      partNumber,
      partName,
      processStep,
      status: "DRAFT",
      oemId: session.user.companyId,
      supplierId,
      responsibleId: session.user.id,
      defectId,
      rows: [],
    },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId: fmea.id,
      type: "FMEA_CREATED",
      actorId: session.user.id,
      metadata: { title, partNumber, fmeaType },
    },
  })

  revalidatePath("/oem/fmea")
  revalidatePath("/supplier/fmea")
}

export async function saveFmeaRows(fmeaId: string, rows: FmeaRow[]) {
  const session = await auth()
  if (!session || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const fmea = await prisma.fmea.findFirst({
    where: {
      id: fmeaId,
      status: { in: ["DRAFT", "IN_REVIEW"] },
    },
  })
  if (!fmea) {
    return { success: false, error: "FMEA not found" }
  }

  if (session.user.companyType === "SUPPLIER" && fmea.supplierId !== session.user.companyId) {
    return { success: false, error: "Unauthorized" }
  }
  if (session.user.companyType === "OEM" && fmea.oemId !== session.user.companyId) {
    return { success: false, error: "Unauthorized" }
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { rows: rows as any },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_UPDATED",
      actorId: session.user.id,
      metadata: { rowCount: rows.length, maxRpn: Math.max(...rows.map((r) => r.rpn ?? 0)) },
    },
  })

  revalidatePath(`/oem/fmea/${fmeaId}`)
  revalidatePath(`/supplier/fmea/${fmeaId}`)

  return { success: true }
}

export async function submitFmeaForReview(fmeaId: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, supplierId: session.user.companyId, status: "DRAFT" },
    include: { oem: { include: { users: { select: { id: true } } } } },
  })
  if (!fmea) {
    return { success: false, error: "FMEA not found or not in DRAFT status" }
  }

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: { status: "IN_REVIEW", submittedAt: new Date() },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_UPDATED",
      actorId: session.user.id,
      metadata: { action: "submitted_for_review" },
    },
  })

  if (fmea.oem.users.length > 0) {
    await prisma.notification.createMany({
      data: fmea.oem.users.map((user) => ({
        userId: user.id,
        message: `FMEA "${fmea.title}" submitted for review`,
        type: "INFO",
        link: `/oem/fmea/${fmeaId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/supplier/fmea/${fmeaId}`)
  revalidatePath("/supplier/fmea")
  revalidatePath(`/oem/fmea/${fmeaId}`)

  return { success: true }
}

export async function approveFmea(fmeaId: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const fmea = await prisma.fmea.findFirst({
    where: { id: fmeaId, oemId: session.user.companyId, status: "IN_REVIEW" },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!fmea) {
    return { success: false, error: "FMEA not found or not in IN_REVIEW status" }
  }

  const rows = ((fmea.rows ?? []) as unknown) as FmeaRow[]
  const hasHighRpn = rows.some((r) => (r.rpn ?? 0) >= 200)

  await prisma.fmea.update({
    where: { id: fmeaId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: session.user.id,
      revisionNo: fmea.revisionNo,
    },
  })

  await prisma.fmeaEvent.create({
    data: {
      fmeaId,
      type: "FMEA_APPROVED",
      actorId: session.user.id,
      metadata: { title: fmea.title, maxRpn: Math.max(...rows.map((r) => r.rpn ?? 0), 0) },
    },
  })

  if (fmea.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: fmea.supplier.users.map((user) => ({
        userId: user.id,
        message: `FMEA "${fmea.title}" approved`,
        type: "INFO",
        link: `/supplier/fmea/${fmeaId}`,
        isRead: false,
      })),
    })
  }

  if (hasHighRpn) {
    const highRpnRows = rows.filter((r) => (r.rpn ?? 0) >= 200)
    await prisma.notification.createMany({
      data: fmea.supplier.users.map((user) => ({
        userId: user.id,
        message: `FMEA "${fmea.title}" has ${highRpnRows.length} high-RPN items (RPN >= 200)`,
        type: "FMEA_HIGH_RPN",
        link: `/supplier/fmea/${fmeaId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/oem/fmea/${fmeaId}`)
  revalidatePath("/oem/fmea")
  revalidatePath(`/supplier/fmea/${fmeaId}`)

  return { success: true }
}