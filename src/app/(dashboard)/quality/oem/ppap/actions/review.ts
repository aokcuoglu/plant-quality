"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireFeature } from "@/lib/billing"
import { revalidatePath } from "next/cache"
import { getDefaultRequirements, PPAP_REQUIREMENTS } from "@/lib/ppap"
import type { PpapLevel, PpapReasonForSubmission, PpapSubmissionRequirement } from "@/generated/prisma/client"

function generateRequestNumber(): string {
  const prefix = "PPAP"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

function canManagePpap(session: { user: { companyType: string; role: string } } | null, type: "OEM" | "SUPPLIER"): boolean {
  if (!session) return false
  if (session.user.companyType !== type) return false
  return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
}

export async function createPpapRequest(formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (session.user.companyType !== "OEM") return { success: false, error: "Only OEM users can create PPAP requests" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Insufficient role" }

  const featureGate = requireFeature(session, "PPAP")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "PPAP requires a higher plan" }

  const supplierId = formData.get("supplierId") as string
  const partNumber = formData.get("partNumber") as string
  const partName = formData.get("partName") as string
  const projectName = (formData.get("projectName") as string) || null
  const vehicleModel = (formData.get("vehicleModel") as string) || null
  const revisionLevel = (formData.get("revisionLevel") as string) || null
  const drawingNumber = (formData.get("drawingNumber") as string) || null
  const revision = (formData.get("revision") as string) || "A"
  const level = (formData.get("level") as PpapLevel) || "LEVEL_3"
  const reasonForSubmission = (formData.get("reasonForSubmission") as PpapReasonForSubmission) || "NEW_PART"
  const dueDateStr = formData.get("dueDate") as string | null
  const notes = (formData.get("notes") as string) || null
  const requirementsStr = formData.get("requirements") as string | null

  if (!supplierId || !partNumber || !partName) {
    return { success: false, error: "Supplier, part number, and part name are required" }
  }

  const supplier = await prisma.company.findFirst({
    where: { id: supplierId, type: "SUPPLIER" },
    include: { users: { select: { id: true } } },
  })
  if (!supplier) return { success: false, error: "Invalid supplier" }

  let requirements: Record<string, boolean>
  if (requirementsStr) {
    try {
      const parsed = JSON.parse(requirementsStr)
      requirements = {}
      for (const r of PPAP_REQUIREMENTS) {
        requirements[r.key] = parsed[r.key] ?? false
      }
    } catch {
      requirements = getDefaultRequirements(level)
    }
  } else {
    requirements = getDefaultRequirements(level)
  }

  const requestNumber = generateRequestNumber()

  const ppap = await prisma.ppapSubmission.create({
    data: {
      requestNumber,
      partNumber,
      partName,
      projectName,
      vehicleModel,
      revisionLevel,
      drawingNumber,
      revision,
      level,
      reasonForSubmission,
      status: "REQUESTED",
      oemId: session.user.companyId,
      supplierId,
      oemOwnerId: session.user.id,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      notes,
      requirements: requirements as Record<string, boolean>,
    },
  })

  const evidenceData = PPAP_REQUIREMENTS
    .filter((r) => (requirements as Record<string, boolean>)[r.key] === true)
    .map((r) => ({
      ppapId: ppap.id,
      requirement: r.key as PpapSubmissionRequirement,
      status: "MISSING" as const,
      companyId: session.user.companyId!,
    }))

  if (evidenceData.length > 0) {
    await prisma.ppapEvidence.createMany({ data: evidenceData })
  }

  await prisma.ppapEvent.create({
    data: {
      ppapId: ppap.id,
      type: "PPAP_CREATED",
      actorId: session.user.id,
      metadata: { partNumber, partName, level, reasonForSubmission, requestNumber },
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

  return { success: true, ppapId: ppap.id, requestNumber }
}

export async function approvePpap(ppapId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Unauthorized" }

  const featureGate = requireFeature(session, "PPAP")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "PPAP requires a higher plan" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) return { success: false, error: "PPAP not found or not in a reviewable status" }

  const requiredEvidences = await prisma.ppapEvidence.findMany({
    where: { ppapId, deletedAt: null },
  })
  const hasIneligibleDocs = requiredEvidences.some((e) => e.status !== "APPROVED")
  if (hasIneligibleDocs) return { success: false, error: "Cannot approve — all required documents must be approved before final PPAP approval" }

  const now = new Date()
  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "APPROVED",
      approvedAt: now,
      approvedById: session.user.id,
      reviewedAt: now,
      reviewedById: session.user.id,
      rejectedAt: null,
      rejectedById: null,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_APPROVED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber, requestNumber: ppap.requestNumber },
    },
  })

  if (ppap.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.supplier.users.map((user) => ({
        userId: user.id,
        companyId: ppap.supplierId,
        message: `PPAP ${ppap.requestNumber} (${ppap.partNumber}) approved`,
        type: "PPAP_APPROVED",
        link: `/quality/supplier/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${ppapId}`)
  revalidatePath("/quality/supplier/ppap")

  return { success: true }
}

export async function rejectPpap(ppapId: string, reason: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Unauthorized" }

  const featureGate = requireFeature(session, "PPAP")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "PPAP requires a higher plan" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) return { success: false, error: "PPAP not found or not in a rejectable status" }

  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectedById: session.user.id,
      rejectionReason: reason,
      approvedAt: null,
      approvedById: null,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
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
        message: `PPAP ${ppap.requestNumber} (${ppap.partNumber}) rejected: ${reason.slice(0, 100)}`,
        type: "PPAP_REJECTED",
        link: `/quality/supplier/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${ppapId}`)
  revalidatePath("/quality/supplier/ppap")

  return { success: true }
}

export async function requestPpapRevision(ppapId: string, reason: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Unauthorized" }

  const featureGate = requireFeature(session, "PPAP")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "PPAP requires a higher plan" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) return { success: false, error: "PPAP not found or not in a reviewable status" }

  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "REVISION_REQUIRED",
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_REVISION_REQUESTED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber, reason: reason.slice(0, 200) },
    },
  })

  if (ppap.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.supplier.users.map((user) => ({
        userId: user.id,
        companyId: ppap.supplierId,
        message: `Revision requested for PPAP ${ppap.requestNumber} (${ppap.partNumber}): ${reason.slice(0, 100)}`,
        type: "PPAP_REQUIRED",
        link: `/quality/supplier/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${ppapId}`)
  revalidatePath("/quality/supplier/ppap")

  return { success: true }
}

export async function cancelPpap(ppapId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Unauthorized" }

  const featureGate = requireFeature(session, "PPAP")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "PPAP requires a higher plan" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId, status: { in: ["DRAFT", "REQUESTED", "SUPPLIER_IN_PROGRESS"] } },
    include: { supplier: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) return { success: false, error: "PPAP not found or cannot be cancelled" }

  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: { status: "CANCELLED" },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_CANCELLED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber },
    },
  })

  if (ppap.supplier.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.supplier.users.map((user) => ({
        userId: user.id,
        companyId: ppap.supplierId,
        message: `PPAP ${ppap.requestNumber} (${ppap.partNumber}) cancelled by OEM`,
        type: "INFO",
        link: `/quality/supplier/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${ppapId}`)
  revalidatePath("/quality/supplier/ppap")

  return { success: true }
}

export async function reviewPpapDocument(evidenceId: string, action: "APPROVED" | "REJECTED" | "REVISION_REQUIRED", comment?: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Unauthorized" }

  const featureGate = requireFeature(session, "PPAP")
  if (!featureGate.allowed) return { success: false, error: featureGate.reason ?? "PPAP requires a higher plan" }

  const evidence = await prisma.ppapEvidence.findUnique({
    where: { id: evidenceId },
    include: { ppap: true },
  })
  if (!evidence) return { success: false, error: "Document not found" }
  if (evidence.ppap.oemId !== session.user.companyId) return { success: false, error: "Unauthorized" }
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(evidence.ppap.status)) {
    return { success: false, error: "PPAP is not in a reviewable status" }
  }

  const reviewableStatuses = ["UPLOADED", "UNDER_REVIEW", "REVISION_REQUIRED"]
  if (!reviewableStatuses.includes(evidence.status)) {
    return { success: false, error: `Document status '${evidence.status}' cannot be reviewed` }
  }

  const eventType = action === "APPROVED" ? "PPAP_DOCUMENT_APPROVED" : action === "REJECTED" ? "PPAP_DOCUMENT_REJECTED" : "PPAP_DOCUMENT_REVISION_REQUESTED"

  await prisma.ppapEvidence.update({
    where: { id: evidenceId },
    data: {
      status: action,
      oemComment: comment ?? null,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  })

  if (evidence.ppap.status === "SUBMITTED") {
    await prisma.ppapSubmission.update({
      where: { id: evidence.ppapId },
      data: { status: "UNDER_REVIEW" },
    })
  }

  await prisma.ppapEvent.create({
    data: {
      ppapId: evidence.ppapId,
      type: eventType,
      actorId: session.user.id,
      metadata: { requirement: evidence.requirement, action },
    },
  })

  revalidatePath(`/quality/oem/ppap/${evidence.ppapId}`)
  revalidatePath("/quality/oem/ppap")
  revalidatePath(`/quality/supplier/ppap/${evidence.ppapId}`)
  revalidatePath("/quality/supplier/ppap")

  return { success: true }
}

export async function addPpapReviewComment(ppapId: string, requirement: PpapSubmissionRequirement, comment: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "OEM")) return { success: false, error: "Unauthorized" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, oemId: session.user.companyId },
  })
  if (!ppap) return { success: false, error: "PPAP not found" }

  await prisma.ppapReviewComment.create({
    data: {
      ppapId,
      requirement,
      comment,
      authorId: session.user.id,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "REVIEW_COMMENT_ADDED",
      actorId: session.user.id,
      metadata: { requirement, comment: comment.slice(0, 200) },
    },
  })

  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")

  return { success: true }
}