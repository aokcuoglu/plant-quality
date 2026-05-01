import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"

const UPLOADABLE_STATUSES = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"] as const

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ppapId, requirement, fileName, contentType } = await req.json()
  if (!ppapId || !requirement || !fileName || !contentType) {
    return NextResponse.json({ error: "ppapId, requirement, fileName, and contentType are required" }, { status: 400 })
  }

  const ppap = await prisma.ppapSubmission.findFirst({
    where: {
      id: ppapId,
      supplierId: session.user.companyId,
      status: { in: [...UPLOADABLE_STATUSES] },
    },
  })
  if (!ppap) {
    return NextResponse.json({ error: "PPAP not found or not in an uploadable status" }, { status: 403 })
  }

  const ext = fileName.split(".").pop() ?? "bin"
  const key = `ppap/${session.user.companyId}/${ppapId}/${requirement}/${randomUUID()}.${ext}`

  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  )

  return NextResponse.json({ key, uploadUrl })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { evidenceId, storageKey, fileName, mimeType, sizeBytes, supplierComment } = await req.json()
  if (!evidenceId || !storageKey || !fileName) {
    return NextResponse.json({ error: "evidenceId, storageKey, and fileName are required" }, { status: 400 })
  }

  const evidence = await prisma.ppapEvidence.findUnique({
    where: { id: evidenceId },
    include: { ppap: true },
  })
  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 })
  }

  if (evidence.ppap.supplierId !== session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (!UPLOADABLE_STATUSES.includes(evidence.ppap.status as typeof UPLOADABLE_STATUSES[number])) {
    return NextResponse.json({ error: "PPAP is not in an uploadable status" }, { status: 400 })
  }

  const updated = await prisma.ppapEvidence.update({
    where: { id: evidenceId },
    data: {
      storageKey,
      fileName,
      mimeType: mimeType ?? "application/octet-stream",
      sizeBytes: sizeBytes ?? 0,
      status: "UPLOADED",
      uploadedById: session.user.id,
      supplierComment: supplierComment ?? undefined,
      deletedAt: null,
    },
  })

  if (evidence.ppap.status === "REQUESTED") {
    await prisma.ppapSubmission.update({
      where: { id: evidence.ppapId },
      data: { status: "SUPPLIER_IN_PROGRESS" },
    })
  }

  await prisma.ppapEvent.create({
    data: {
      ppapId: evidence.ppapId,
      type: "PPAP_DOCUMENT_UPLOADED",
      actorId: session.user.id,
      metadata: { requirement: evidence.requirement },
    },
  })

  return NextResponse.json({ success: true, evidence: updated })
}