"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { PpapSubmissionRequirement } from "@/generated/prisma/client"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"

function canManagePpap(session: { user: { companyType: string; role: string } } | null, type: "OEM" | "SUPPLIER"): boolean {
  if (!session) return false
  if (session.user.companyType !== type) return false
  return ["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)
}

export async function uploadPpapDocument(ppapId: string, requirement: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "SUPPLIER")) return { success: false, error: "Unauthorized" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, supplierId: session.user.companyId, status: { in: ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"] } },
  })
  if (!ppap) return { success: false, error: "PPAP not found or not in an uploadable status" }

  const supplierComment = (formData.get("supplierComment") as string) || null
  const existingEvidence = await prisma.ppapEvidence.findFirst({
    where: { ppapId, requirement: requirement as PpapSubmissionRequirement, deletedAt: null },
  })

  if (!existingEvidence) {
    return { success: false, error: "Document requirement not found in checklist" }
  }

  const existing = await prisma.ppapEvidence.update({
    where: { id: existingEvidence.id },
    data: {
      status: "UPLOADED",
      supplierComment,
      uploadedById: session.user.id,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_DOCUMENT_UPLOADED" as const,
      actorId: session.user.id,
      metadata: { requirement },
    },
  })

  if (ppap.status === "REQUESTED") {
    await prisma.ppapSubmission.update({
      where: { id: ppapId },
      data: { status: "SUPPLIER_IN_PROGRESS" },
    })
  }

  revalidatePath(`/quality/supplier/ppap/${ppapId}`)
  revalidatePath("/quality/supplier/ppap")
  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")

  return { success: true, evidenceId: existing.id }
}

export async function submitPpapPackage(ppapId: string, supplierNotes?: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }
  if (!canManagePpap(session, "SUPPLIER")) return { success: false, error: "Unauthorized" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: { id: ppapId, supplierId: session.user.companyId, status: { in: ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"] } },
    include: { oem: { include: { users: { select: { id: true } } } } },
  })
  if (!ppap) return { success: false, error: "PPAP not found or not in a submittable status" }

  const requiredEvidences = await prisma.ppapEvidence.findMany({
    where: { ppapId, deletedAt: null },
  })
  const hasMissing = requiredEvidences.some((e) => e.status === "MISSING")
  if (hasMissing) return { success: false, error: "Cannot submit — some required documents are still missing" }

  await prisma.ppapSubmission.update({
    where: { id: ppapId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      supplierAssigneeId: session.user.id,
      supplierNotes: supplierNotes ?? undefined,
    },
  })

  await prisma.ppapEvent.create({
    data: {
      ppapId,
      type: "PPAP_SUBMITTED",
      actorId: session.user.id,
      metadata: { partNumber: ppap.partNumber },
    },
  })

  if (ppap.oem.users.length > 0) {
    await prisma.notification.createMany({
      data: ppap.oem.users.map((user) => ({
        userId: user.id,
        companyId: ppap.oemId,
        message: `PPAP ${ppap.requestNumber} (${ppap.partNumber}) submitted by supplier`,
        type: "PPAP_SUBMITTED",
        link: `/quality/oem/ppap/${ppapId}`,
        isRead: false,
      })),
    })
  }

  revalidatePath(`/quality/supplier/ppap/${ppapId}`)
  revalidatePath("/quality/supplier/ppap")
  revalidatePath(`/quality/oem/ppap/${ppapId}`)
  revalidatePath("/quality/oem/ppap")

  return { success: true }
}

export async function getPpapPresignedUploadUrl(ppapId: string, requirement: string, fileName: string, contentType: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: {
      id: ppapId,
      OR: [
        { oemId: session.user.companyId },
        { supplierId: session.user.companyId },
      ],
    },
  })
  if (!ppap) return { success: false, error: "PPAP not found" }

  const ext = fileName.split(".").pop() || "bin"
  const key = `ppap/${session.user.companyId}/${ppapId}/${requirement}/${Date.now()}.${ext}`

  const { PutObjectCommand } = await import("@aws-sdk/client-s3")
  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  )

  return { success: true, key, uploadUrl }
}

export async function getPpapDocumentDownloadUrl(evidenceId: string) {
  const session = await auth()
  if (!session?.user?.companyId) return { success: false, error: "Not authenticated" }

  const evidence = await prisma.ppapEvidence.findUnique({
    where: { id: evidenceId },
    include: { ppap: true },
  })
  if (!evidence || !evidence.storageKey) return { success: false, error: "Document not found" }

  if (evidence.ppap.oemId !== session.user.companyId && evidence.ppap.supplierId !== session.user.companyId) {
    return { success: false, error: "Unauthorized" }
  }

  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: evidence.storageKey }),
    { expiresIn: 300 },
  )

  return { success: true, url, fileName: evidence.fileName }
}