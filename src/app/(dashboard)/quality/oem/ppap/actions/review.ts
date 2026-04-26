"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { PpapLevel, PpapSubmissionRequirement } from "@/generated/prisma/client"

function canManagePpap(session: { user: { companyType: string; role: string } } | null, type: "OEM" | "SUPPLIER"): boolean {
  if (!session) return false
  if (session.user.companyType !== type) return false
  return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
}

function requirementKeys(): PpapSubmissionRequirement[] {
  return [
    "DESIGN_RECORDS",
    "ENGINEERING_CHANGE_DOCUMENTS",
    "CUSTOMER_ENGINEERING_APPROVAL",
    "DESIGN_FMEA",
    "PROCESS_FLOW_DIAGRAM",
    "PROCESS_FMEA",
    "CONTROL_PLAN",
    "MEASUREMENT_SYSTEM_ANALYSIS",
    "DIMENSIONAL_RESULTS",
    "MATERIAL_PERFORMANCE_RESULTS",
    "INITIAL_PROCESS_STUDY",
    "QUALIFIED_LABORATORY_DOCUMENTATION",
    "APPEARANCE_APPROVAL_REPORT",
    "SAMPLE_PRODUCTION_PARTS",
    "MASTER_SAMPLE",
    "CHECKING_ASSIST",
    "PART_SUBMISSION_WARRANT",
  ]
}

export async function createPpap(formData: FormData) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) return

  const supplierId = formData.get("supplierId") as string
  const partNumber = formData.get("partNumber") as string
  const partName = formData.get("partName") as string
  const level = (formData.get("level") as PpapLevel) || "LEVEL_3"
  const defectId = (formData.get("defectId") as string) || null
  const dueDateStr = formData.get("dueDate") as string | null
  const notes = (formData.get("notes") as string) || null
  const requirementsStr = formData.get("requirements") as string | null

  if (!supplierId || !partNumber || !partName) return

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    include: { users: { select: { id: true } } },
  })
  if (!supplier) return

  const requirements: Record<string, boolean> = {}
  if (requirementsStr) {
    try {
      const parsed = JSON.parse(requirementsStr)
      for (const key of requirementKeys()) {
        requirements[key] = parsed[key] ?? false
      }
    } catch {
      for (const key of requirementKeys()) {
        requirements[key] = key === "PART_SUBMISSION_WARRANT" || (level !== "LEVEL_1" && (key === "DESIGN_RECORDS" || key === "PROCESS_FLOW_DIAGRAM"))
      }
    }
  } else {
    for (const key of requirementKeys()) {
      requirements[key] = key === "PART_SUBMISSION_WARRANT" || (level !== "LEVEL_1" && (key === "DESIGN_RECORDS" || key === "PROCESS_FLOW_DIAGRAM"))
    }
  }

  const ppap = await prisma.ppapSubmission.create({
    data: {
      partNumber,
      partName,
      level,
      status: "DRAFT",
      oemId: session.user.companyId,
      supplierId,
      oemOwnerId: session.user.id,
      defectId,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      notes,
      requirements: requirements as Record<string, boolean>,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId: ppap.id,
      type: "PPAP_CREATED",
      actorId: session.user.id,
      metadata: { partNumber, partName, level },
    },
  })

  if (supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: supplier.users.map((user) => ({
        userId: user.id,
        companyId: supplierId,
        message: `New PPAP request: ${partNumber} — ${partName}`,
        type: "PPAP_REQUIRED",
        link: `/quality/supplier/ppap/${ppap.id}`,
        isRead: false,
      })),
    })
  }

  revalidatePath("/quality/oem/ppap")
  revalidatePath("/quality/supplier/ppap")
}

export async function approvePpap(ppapId: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId, status: "SUBMITTED" },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) {
    return { success: false, error: "PPAP not found or not in SUBMITTED status" }
  }

  const now = new Date()
  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "APPROVED",
      approvedAt: now,
      approvedById: session.user.id,
      rejectedAt: null,
      rejectedById: null,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_APPROVED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber },
    },
  })

  if (ppap.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.supplier.users.map((user) => ({
        userId: user.id,
        companyId: ppap.supplierId,
        message: `PPAP ${ppap.partNumber} approved`,
        type: "PPAP_APPROVED",
        link: `/quality/supplier/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${ppapId}`)

  return { success: true }
}

export async function rejectPpap(ppapId: string, reason: string) {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized" }
  }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId, status: "SUBMITTED" },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) {
    return { success: false, error: "PPAP not found or not in SUBMITTED status" }
  }

  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedById: session.user.id,
      rejectionReason: reason,
      approvedAt: null,
      approvedById: null,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_REJECTED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber, reason: reason.slice(0, 200) },
    },
  })

  if (ppap.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.supplier.users.map((user) => ({
        userId: user.id,
        companyId: ppap.supplierId,
        message: `PPAP ${ppap.partNumber} rejected: ${reason.slice(0, 100)}`,
        type: "PPAP_REJECTED",
        link: `/quality/supplier/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${ppapId}`)

  return { success: true }
}