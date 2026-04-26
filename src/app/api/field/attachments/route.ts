import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { randomUUID } from "crypto"

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/quicktime",
])

const MAX_FILE_SIZE = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Only OEM users can upload attachments" }, { status: 403 })
  }

  const formData = await request.formData()
  const fieldDefectId = formData.get("fieldDefectId") as string | null
  const file = formData.get("file")

  if (!fieldDefectId || !(file instanceof File)) {
    return NextResponse.json({ error: "fieldDefectId and file are required" }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, PNG, JPG, WEBP, MP4, MOV" },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 20MB." }, { status: 400 })
  }

  const fieldDefect = await prisma.fieldDefect.findFirst({
    where: { id: fieldDefectId, oemId: session.user.companyId, deletedAt: null },
  })
  if (!fieldDefect) {
    return NextResponse.json({ error: "Field defect not found" }, { status: 404 })
  }

  const attachmentCount = await prisma.fieldDefectAttachment.count({
    where: { fieldDefectId, deletedAt: null },
  })
  if (attachmentCount >= 15) {
    return NextResponse.json({ error: "Maximum 15 attachments per field defect" }, { status: 400 })
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase()
  const storageKey = `field-defects/${fieldDefectId}/${randomUUID()}-${sanitized}`
  const bytes = await file.arrayBuffer()

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: storageKey,
        Body: Buffer.from(bytes),
        ContentType: file.type,
      }),
    )
  } catch {
    return NextResponse.json({ error: "File storage upload failed. Please try again." }, { status: 502 })
  }

  const attachment = await prisma.fieldDefectAttachment.create({
    data: {
      fieldDefectId,
      storageKey,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      uploadedById: session.user.id,
      companyId: session.user.companyId,
    },
  })

  await prisma.fieldDefectEvent.create({
    data: {
      fieldDefectId,
      type: "FIELD_DEFECT_ATTACHMENT_ADDED",
      actorId: session.user.id,
      metadata: { fileName: file.name, fileSize: file.size },
    },
  })

  return NextResponse.json({
    id: attachment.id,
    storageKey: attachment.storageKey,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    downloadUrl: `/api/field/attachments/${storageKey}`,
  })
}